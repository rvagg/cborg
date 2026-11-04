/**
 * Publish a bench/compare.js result as a sticky PR comment.
 *
 * Runs in the privileged bench-comment workflow, from the default branch.
 * The result file comes from a pull request job, so it is untrusted: this
 * script validates it field by field, takes only numbers and fixed enum
 * values from it, and renders the comment text itself with
 * bench/compare-report.js from the same default-branch checkout.
 *
 * Environment:
 *   RESULT_PATH   path to the downloaded result.json
 *   REPO          owner/name
 *   HEAD_SHA      workflow_run.head_sha
 *   EVENT_PRS     JSON of workflow_run.pull_requests
 *   GH_TOKEN      token for gh api (not needed with DRY_RUN)
 *   DRY_RUN       when set, print the comment and the API calls instead of making them
 */

import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { renderReport } from '../../bench/compare-report.js'

export const MARKER = '<!-- cborg-bench -->'
export const BOT_LOGIN = 'github-actions[bot]'
export const MAX_BYTES = 64 * 1024
export const MAX_ROWS = 256

const NAME_RE = /^[A-Za-z0-9_/ .()-]{1,64}$/
const NODE_RE = /^[0-9A-Za-z.+-]{1,32}$/
const PLATFORM_RE = /^[a-z0-9]{1,16}$/
const CPU_RE = /^[A-Za-z0-9 ._()@/+,-]{0,128}$/
const OPS = ['encode', 'decode']
const STATUSES = ['same', 'improved', 'regressed', 'unconfirmed']

export class ValidationError extends Error {}

/**
 * @param {boolean} ok
 * @param {string} msg
 */
function check (ok, msg) {
  if (!ok) throw new ValidationError(msg)
}

/**
 * @param {unknown} o
 * @param {string[]} keys
 * @param {string} where
 */
function exactKeys (o, keys, where) {
  check(typeof o === 'object' && o !== null && !Array.isArray(o), `${where} must be an object`)
  const got = Object.keys(/** @type {object} */ (o)).sort()
  check(JSON.stringify(got) === JSON.stringify(keys.slice().sort()), `${where} must have exactly the keys ${keys.join(', ')}, got ${got.join(', ')}`)
}

/**
 * @param {unknown} x
 * @param {number} lo
 * @param {number} hi
 * @param {string} where
 */
function num (x, lo, hi, where) {
  check(typeof x === 'number' && Number.isFinite(x), `${where} must be a finite number`)
  check(/** @type {number} */ (x) >= lo && /** @type {number} */ (x) <= hi, `${where} must be within ${lo}..${hi}`)
}

/**
 * @param {unknown} x
 * @param {number} lo
 * @param {number} hi
 * @param {string} where
 */
function int (x, lo, hi, where) {
  num(x, lo, hi, where)
  check(Number.isInteger(x), `${where} must be an integer`)
}

/**
 * Parse and strictly validate result text. Returns the parsed object.
 * Throws ValidationError with a reason on any deviation.
 *
 * @param {string} text
 * @returns {any}
 */
export function validate (text) {
  check(typeof text === 'string', 'result must be text')
  check(Buffer.byteLength(text) <= MAX_BYTES, `result exceeds ${MAX_BYTES} bytes`)
  /** @type {any} */
  let r
  try {
    r = JSON.parse(text)
  } catch (err) {
    throw new ValidationError('result is not valid JSON')
  }
  exactKeys(r, ['schema', 'environment', 'rows', 'headline'], 'result')
  check(r.schema === 1, 'unsupported schema version')

  const env = r.environment
  exactKeys(env, ['node', 'platform', 'cpu', 'rounds', 'window'], 'environment')
  check(typeof env.node === 'string' && NODE_RE.test(env.node), 'environment.node has an unexpected format')
  check(typeof env.platform === 'string' && PLATFORM_RE.test(env.platform), 'environment.platform has an unexpected format')
  check(typeof env.cpu === 'string' && CPU_RE.test(env.cpu), 'environment.cpu has an unexpected format')
  int(env.rounds, 1, 1000, 'environment.rounds')
  int(env.window, 1, 100000, 'environment.window')

  check(Array.isArray(r.rows), 'rows must be an array')
  check(r.rows.length >= 1 && r.rows.length <= MAX_ROWS, `rows must hold 1..${MAX_ROWS} entries`)
  const seen = new Set()
  r.rows.forEach((/** @type {any} */ row, /** @type {number} */ i) => {
    const where = `rows[${i}]`
    exactKeys(row, ['name', 'op', 'delta', 'noise', 'status'], where)
    check(typeof row.name === 'string' && NAME_RE.test(row.name), `${where}.name has an unexpected format`)
    check(OPS.includes(row.op), `${where}.op must be one of ${OPS.join(', ')}`)
    check(STATUSES.includes(row.status), `${where}.status must be one of ${STATUSES.join(', ')}`)
    num(row.delta, -100, 10000, `${where}.delta`)
    num(row.noise, 0, 10000, `${where}.noise`)
    check(row.status !== 'improved' || row.delta > 0, `${where} is improved with a delta that is not positive`)
    check(row.status !== 'regressed' || row.delta < 0, `${where} is regressed with a delta that is not negative`)
    const key = `${row.op}\0${row.name}`
    check(!seen.has(key), `${where} repeats ${row.op} ${row.name}`)
    seen.add(key)
  })

  const h = r.headline
  exactKeys(h, ['encode', 'decode', 'controlEncode', 'controlDecode', 'rows'], 'headline')
  for (const k of ['encode', 'decode', 'controlEncode', 'controlDecode']) num(h[k], -100, 10000, `headline.${k}`)
  check(h.rows === r.rows.length, 'headline.rows must equal the number of rows')
  return r
}

/**
 * Id of the sticky comment: the oldest one that carries the marker and was
 * written by the Actions bot.
 *
 * @param {{ id: number, login?: string, body?: string }[]} comments
 * @returns {number|null}
 */
export function findExisting (comments) {
  const mine = comments
    .filter((c) => c.login === BOT_LOGIN && typeof c.body === 'string' && c.body.includes(MARKER))
    .sort((a, b) => a.id - b.id)
  return mine.length ? mine[0].id : null
}

/**
 * The single open pull request in `repo` whose head is `headSha`.
 * Throws when there are none or several.
 *
 * @param {any[]} pulls
 * @param {string} headSha
 * @param {string} repo owner/name
 * @returns {number}
 */
export function pickPull (pulls, headSha, repo) {
  const match = pulls.filter((p) => p && p.state === 'open' &&
    p.head && p.head.sha === headSha &&
    p.base && p.base.repo && p.base.repo.full_name === repo &&
    Number.isInteger(p.number))
  if (match.length !== 1) {
    throw new Error(`expected exactly one open pull request at ${headSha} in ${repo}, found ${match.length}`)
  }
  return match[0].number
}

/**
 * @param {string} text
 * @returns {number[]} pull request numbers from workflow_run.pull_requests
 */
export function parseEventPulls (text) {
  const arr = JSON.parse(text || '[]')
  if (!Array.isArray(arr)) return []
  return arr.map((p) => p && p.number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 1)
}

/**
 * @param {string[]} args
 * @param {string} [input]
 * @returns {string}
 */
function gh (args, input) {
  return execFileSync('gh', ['api', ...args], { encoding: 'utf8', input, maxBuffer: 1 << 26 })
}

async function main () {
  const env = process.env
  const dry = Boolean(env.DRY_RUN)
  const repo = env.REPO || ''
  const headSha = env.HEAD_SHA || ''
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('REPO must be owner/name')
  if (!/^[0-9a-f]{40}$/.test(headSha)) throw new Error('HEAD_SHA must be a full commit sha')

  const path = env.RESULT_PATH || ''
  const st = lstatSync(path)
  check(st.isFile(), 'result path is not a regular file')
  check(st.size <= MAX_BYTES, `result exceeds ${MAX_BYTES} bytes`)
  const result = validate(readFileSync(path, 'utf8'))
  const body = `${MARKER}\n${renderReport(result)}`

  /** @type {number|string} */
  let pr
  const fromEvent = parseEventPulls(env.EVENT_PRS || '[]')
  if (dry) {
    pr = fromEvent[0] || '<resolved at runtime>'
    console.log(`DRY RUN: would resolve the pull request via ${fromEvent.length ? `GET repos/${repo}/pulls/${pr}` : `GET repos/${repo}/commits/${headSha}/pulls`}`)
  } else {
    const pulls = fromEvent.length
      ? [JSON.parse(gh([`repos/${repo}/pulls/${fromEvent[0]}`]))]
      : JSON.parse(gh([`repos/${repo}/commits/${headSha}/pulls`]))
    pr = pickPull(pulls, headSha, repo)
  }

  if (dry) {
    console.log(`DRY RUN: would GET repos/${repo}/issues/${pr}/comments (paginated) and look for ${MARKER} by ${BOT_LOGIN}`)
    console.log(`DRY RUN: would POST repos/${repo}/issues/${pr}/comments, or PATCH repos/${repo}/issues/comments/<id> when one exists`)
    console.log('DRY RUN: comment body follows\n---')
    console.log(body)
    return
  }
  const comments = gh(['--paginate', `repos/${repo}/issues/${pr}/comments`,
    '--jq', '.[] | {id: .id, login: .user.login, body: .body}'])
    .split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const existing = findExisting(comments)
  const payload = JSON.stringify({ body })
  if (existing) {
    gh(['--method', 'PATCH', `repos/${repo}/issues/comments/${existing}`, '--input', '-'], payload)
    console.log(`updated comment ${existing} on #${pr}`)
  } else {
    gh(['--method', 'POST', `repos/${repo}/issues/${pr}/comments`, '--input', '-'], payload)
    console.log(`created comment on #${pr}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof ValidationError ? `rejected: ${err.message}` : `failed: ${err.message}`)
    process.exit(1)
  })
}
