/**
 * Compare the encode/decode throughput of two cborg trees.
 *
 *   node bench/compare.js --base-ref=master
 *   node bench/compare.js --base=../cborg-old --head=. --rounds=8
 *
 * Options:
 *   --base=DIR | --base-ref=REF   tree to compare against (required, one of)
 *   --head=DIR                    tree under test (default: this checkout)
 *   --rounds=N                    fresh-process rounds per variant (default 8)
 *   --confirm-rounds=N            extra rounds when rows are flagged (default 4)
 *   --window=MS                   timed window per workload and op (default 70)
 *   --suite=NAME                  bsky, filecoin, micro or tiny (default all)
 *   --mode=dag-cbor|raw           option profile (default dag-cbor)
 *   --json=FILE --markdown=FILE   write the result
 *
 * Each variant (base, head, and control, which is base again) runs in its
 * own fresh node process every round, in a rotating order. A row's delta is
 * the median of the within-round head/base throughput ratios. A row is
 * flagged when |delta| > max(3%, 3 x MAD of the control/base ratios), and a
 * flagged row is reported only if extra fresh-process rounds reproduce it.
 * The extra rounds run the full workload list, because a row's speed depends
 * on what ran before it in the process.
 *
 * Only cborg.js and lib/ of each tree are loaded. Fixtures and options come
 * from this checkout's bench/ so both variants see identical inputs.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { cpus, platform, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { makeProfile, SUITES, workloads } from './compare-profile.js'
import { renderReport } from './compare-report.js'
import { classify, headline, round2, rowStats } from './compare-stats.js'

const SELF = fileURLToPath(import.meta.url)
const HERE_ROOT = resolve(dirname(SELF), '..')
const VARIANTS = ['base', 'head', 'control']
const OPS = ['encode', 'decode']

/**
 * @param {string[]} argv
 * @returns {Record<string, string|true>}
 */
function parseArgs (argv) {
  /** @type {Record<string, string|true>} */
  const out = {}
  for (const a of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(a)
    if (!m) fail(`unrecognised argument: ${a}`)
    out[m[1]] = m[2] === undefined ? true : m[2]
  }
  return out
}

/**
 * @param {string} msg
 * @returns {never}
 */
function fail (msg) {
  process.stderr.write(`compare: ${msg}\n`)
  process.exit(1)
}

/**
 * @param {Record<string, string|true>} args
 * @param {string} key
 * @param {number} dflt
 * @param {number} min
 */
function intArg (args, key, dflt, min) {
  if (args[key] === undefined) return dflt
  const n = Number(args[key])
  if (!Number.isInteger(n) || n < min) fail(`--${key} must be an integer >= ${min}`)
  return n
}

/**
 * @param {string} dir
 * @param {string} what
 */
function checkTree (dir, what) {
  for (const f of ['cborg.js', 'lib']) {
    if (!existsSync(join(dir, f))) fail(`${what} tree ${dir} is missing ${f}`)
  }
}

/**
 * Extract a git ref into a fresh temp dir. Read-only on the repository.
 *
 * @param {string} ref
 * @param {string} dest
 */
function extractRef (ref, dest) {
  const archive = spawnSync('git', ['archive', '--format=tar', ref], { cwd: HERE_ROOT, maxBuffer: 1 << 30 })
  if (archive.status !== 0) fail(`git archive ${ref} failed: ${archive.stderr}`)
  const tar = spawnSync('tar', ['-x', '-C', dest], { input: archive.stdout })
  if (tar.status !== 0) fail(`tar failed: ${tar.stderr}`)
}

// -- worker ------------------------------------------------------------------

/**
 * Time one tree on the planned rows and print items/s as JSON.
 *
 * @param {Record<string, string|true>} args
 */
async function worker (args) {
  const lib = await import(pathToFileURL(join(String(args.root), 'cborg.js')).href)
  const profile = makeProfile(lib, args.mode === 'raw' ? 'raw' : 'dag-cbor')
  const window = Number(args.window)
  const plan = JSON.parse(String(args.plan))
  const items = workloads(args.suite ? String(args.suite) : null)
  const encoded = JSON.parse(readFileSync(String(args.cache), 'utf8'))

  const timed = (/** @type {(x: any) => void} */ fn, /** @type {any[]} */ xs) => {
    let count = 0
    const t0 = performance.now()
    let now = t0
    while (now - t0 < window) {
      for (let i = 0; i < xs.length; i++) fn(xs[i])
      count += xs.length
      now = performance.now()
    }
    return count / ((now - t0) / 1000)
  }

  /** @type {Record<string, Record<string, number>>} */
  const out = { encode: {}, decode: {} }
  for (const name of plan.encode) {
    const fn = (/** @type {any} */ x) => lib.encode(x, profile.encodeOptions)
    timed(fn, items[name])
    out.encode[name] = timed(fn, items[name])
  }
  for (const name of plan.decode) {
    const bytes = encoded[name].map((/** @type {string} */ b) => new Uint8Array(Buffer.from(b, 'base64')))
    const fn = (/** @type {any} */ x) => lib.decode(x, profile.decodeOptions)
    timed(fn, bytes)
    out.decode[name] = timed(fn, bytes)
  }
  process.stdout.write(JSON.stringify(out))
}

// -- parent ------------------------------------------------------------------

/**
 * @typedef {{ encode: string[], decode: string[] }} Plan
 * @typedef {Record<string, Record<string, Record<string, number[]>>>} Samples
 *   variant -> op -> workload -> throughput per round
 */

/**
 * Run each variant once in a fresh process, order rotated by round.
 *
 * @param {object} ctx
 * @param {Record<string, string>} ctx.roots
 * @param {Plan} plan
 * @param {number} round
 * @param {Samples} samples
 */
function runRound (ctx, plan, round, samples) {
  const c = /** @type {any} */ (ctx)
  for (let i = 0; i < VARIANTS.length; i++) {
    const variant = VARIANTS[(i + round) % VARIANTS.length]
    const res = spawnSync(process.execPath, [
      SELF, '--worker',
      `--root=${c.roots[variant]}`, `--mode=${c.mode}`, `--window=${c.window}`,
      `--cache=${c.cache}`, `--plan=${JSON.stringify(plan)}`,
      ...(c.suite ? [`--suite=${c.suite}`] : [])
    ], { encoding: 'utf8', maxBuffer: 1 << 26 })
    if (res.status !== 0) {
      fail(`${variant} worker (${c.roots[variant]}) exited with ${res.status ?? res.signal}:\n${res.stderr}`)
    }
    /** @type {Record<string, Record<string, number>>} */
    let out
    try {
      out = JSON.parse(res.stdout)
    } catch (err) {
      return fail(`${variant} worker printed unparseable output: ${res.stdout.slice(0, 200)}`)
    }
    for (const op of OPS) {
      for (const name of plan[/** @type {'encode'|'decode'} */ (op)]) {
        const v = out[op][name]
        if (!(v > 0) || !Number.isFinite(v)) fail(`${variant} worker returned ${v} for ${op} ${name}`)
        ;((samples[variant] ||= {})[op] ||= {})[name] ||= []
        samples[variant][op][name].push(v)
      }
    }
  }
}

/**
 * @param {Samples} s
 * @param {string} op
 * @param {string} name
 */
function statsFor (s, op, name) {
  return rowStats({
    base: s.base[op][name], head: s.head[op][name], control: s.control[op][name]
  })
}

/** @param {string} cpu */
const cleanCpu = (cpu) => cpu.replace(/[^A-Za-z0-9 ._()@/+,-]/g, '?').replace(/\s+/g, ' ').trim().slice(0, 128)

async function main () {
  const args = parseArgs(process.argv.slice(2))
  if (args.worker) return worker(args)

  if (!args.base === !args['base-ref']) fail('give exactly one of --base=DIR and --base-ref=REF')
  const rounds = intArg(args, 'rounds', 8, 3)
  const confirmRounds = intArg(args, 'confirm-rounds', 4, 3)
  const window = intArg(args, 'window', 70, 5)
  const mode = args.mode === undefined ? 'dag-cbor' : String(args.mode)
  if (mode !== 'dag-cbor' && mode !== 'raw') fail('--mode must be dag-cbor or raw')
  const suite = args.suite === undefined ? null : String(args.suite)
  if (suite && !SUITES.includes(suite)) fail(`--suite must be one of ${SUITES.join(', ')}`)

  const scratch = mkdtempSync(join(tmpdir(), 'cborg-compare-'))
  try {
    let baseRoot
    if (args['base-ref']) {
      baseRoot = join(scratch, 'base')
      mkdirSync(baseRoot)
      extractRef(String(args['base-ref']), baseRoot)
    } else {
      baseRoot = resolve(String(args.base))
    }
    const headRoot = args.head ? resolve(String(args.head)) : HERE_ROOT
    checkTree(baseRoot, 'base')
    checkTree(headRoot, 'head')

    // Decode inputs are encoded once with the base tree, identical for all variants.
    const items = workloads(suite)
    const names = Object.keys(items)
    if (!names.length) fail('no workloads selected')
    const baseLib = await import(pathToFileURL(join(baseRoot, 'cborg.js')).href)
    const { encodeOptions } = makeProfile(baseLib, /** @type {'raw'|'dag-cbor'} */ (mode))
    /** @type {Record<string, string[]>} */
    const encoded = {}
    for (const n of names) {
      encoded[n] = items[n].map((x) => Buffer.from(baseLib.encode(x, encodeOptions)).toString('base64'))
    }
    const cache = join(scratch, 'encoded.json')
    writeFileSync(cache, JSON.stringify(encoded))

    const ctx = { roots: { base: baseRoot, head: headRoot, control: baseRoot }, mode, window, cache, suite }
    /** @type {Samples} */
    const samples = {}
    const log = (/** @type {string} */ m) => process.stderr.write(m + '\n')

    /** @type {Plan} */
    const all = { encode: names, decode: names }
    for (let r = 0; r < rounds; r++) {
      log(`round ${r + 1}/${rounds}`)
      runRound(ctx, all, r, samples)
    }

    const flagged = []
    for (const op of OPS) {
      for (const name of names) {
        const s = statsFor(samples, op, name)
        if (classify(s) !== 'same') flagged.push({ op, name })
      }
    }

    /** @type {Samples} */
    const again = {}
    if (flagged.length) {
      // A row's speed depends on the workloads that ran before it in the same
      // process, so the confirmation rounds run the full list and are read for
      // the flagged rows only.
      log(`confirming ${flagged.length} flagged rows over ${confirmRounds} rounds`)
      for (let r = 0; r < confirmRounds; r++) runRound(ctx, all, rounds + r, again)
    }

    const rows = []
    const forHeadline = []
    for (const op of OPS) {
      for (const name of names) {
        const first = statsFor(samples, op, name)
        const second = again.base?.[op]?.[name] ? statsFor(again, op, name) : undefined
        rows.push({
          name,
          op,
          delta: round2(first.delta),
          noise: round2(first.noise),
          status: classify(first, second)
        })
        forHeadline.push({ op, headRatio: first.headRatio, controlRatio: first.controlRatio })
      }
    }
    const h = headline(/** @type {any} */ (forHeadline))
    const result = {
      schema: 1,
      environment: {
        node: process.versions.node,
        platform: platform(),
        cpu: cleanCpu(cpus()[0]?.model || 'unknown'),
        rounds,
        window
      },
      rows,
      headline: {
        encode: round2(h.encode),
        decode: round2(h.decode),
        controlEncode: round2(h.controlEncode),
        controlDecode: round2(h.controlDecode),
        rows: h.rows
      }
    }
    const markdown = renderReport(result)
    if (args.json) writeFileSync(String(args.json), JSON.stringify(result, null, 2) + '\n')
    if (args.markdown) writeFileSync(String(args.markdown), markdown)
    process.stdout.write(markdown)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

main().catch((err) => fail(err && err.stack ? err.stack : String(err)))
