/**
 * cborg benchmark runner
 *
 * Measures encode/decode performance with realistic IPLD/CBOR workloads.
 * Works in both Node.js and browser environments.
 *
 * Usage:
 *   node bench/bench-new.js                    # run all benchmarks (dag-cbor mode)
 *   node bench/bench-new.js --mode=raw         # run with raw cborg (no tags)
 *   node bench/bench-new.js --suite=bsky       # run only bluesky suite
 *   node bench/bench-new.js --json             # output JSON for comparison
 *   node bench/bench-new.js --compare=baseline.json  # compare to baseline
 *   node bench/bench-new.js --encode-into      # use encodeInto instead of encode
 */

import { encode, decode, encodeInto, Token, Type } from '../cborg.js'
import { generateFixtures, BenchCID } from './fixtures.js'

// =============================================================================
// CID Tag Encoder/Decoder (matches @ipld/dag-cbor implementation)
// =============================================================================

const CID_CBOR_TAG = 42

/**
 * CID encoder for CBOR tag 42.
 * Matches the detection logic from @ipld/dag-cbor.
 *
 * @param {any} obj
 * @returns {Token[]|null}
 */
function cidEncoder (obj) {
  // Fast-path rejection for non-CID objects (matches dag-cbor)
  if (obj.asCID !== obj && obj['/'] !== obj.bytes) {
    return null
  }
  // At this point we have something CID-like
  if (!(obj instanceof BenchCID)) {
    return null
  }
  // Encode with 0x00 prefix (historical reasons)
  const bytes = new Uint8Array(obj.bytes.byteLength + 1)
  bytes.set(obj.bytes, 1)
  return [
    new Token(Type.tag, CID_CBOR_TAG),
    new Token(Type.bytes, bytes)
  ]
}

/**
 * CID decoder for CBOR tag 42.
 *
 * @param {Uint8Array} bytes
 * @returns {BenchCID}
 */
function cidDecoder (bytes) {
  if (bytes[0] !== 0) {
    throw new Error('Invalid CID for CBOR tag 42; expected leading 0x00')
  }
  return new BenchCID(bytes.subarray(1))
}

/**
 * Number encoder that rejects NaN and Infinity (matches dag-cbor IPLD constraints)
 *
 * @param {number} num
 * @returns {null}
 */
function numberEncoder (num) {
  if (Number.isNaN(num)) {
    throw new Error('`NaN` is not supported by the IPLD Data Model')
  }
  if (num === Infinity || num === -Infinity) {
    throw new Error('`Infinity` is not supported by the IPLD Data Model')
  }
  return null
}

/**
 * Undefined encoder that throws (matches strict dag-cbor IPLD constraints)
 *
 * @returns {null}
 */
function undefinedEncoder () {
  throw new Error('`undefined` is not supported by the IPLD Data Model')
}

// Strict dag-cbor encode options (Filecoin, micro-benchmarks)
// Throws on undefined values
const dagCborEncodeOptions = {
  float64: true,
  typeEncoders: {
    Object: cidEncoder,
    number: numberEncoder,
    undefined: undefinedEncoder
  }
}

// Bluesky encode options - uses ignoreUndefinedProperties instead of throwing
// This matches Bluesky's actual usage pattern
const bskyEncodeOptions = {
  float64: true,
  ignoreUndefinedProperties: true,
  typeEncoders: {
    Object: cidEncoder,
    number: numberEncoder
  }
}

// dag-cbor-like decode options
const dagCborDecodeOptions = {
  allowIndefinite: false,
  coerceUndefinedToNull: true,
  allowNaN: false,
  allowInfinity: false,
  allowBigInt: true,
  strict: true,
  useMaps: false,
  rejectDuplicateMapKeys: true,
  tags: []
}
dagCborDecodeOptions.tags[CID_CBOR_TAG] = cidDecoder

// Configuration
const WARMUP_ITERATIONS = 50
const DEFAULT_DURATION_MS = 1000
const FIXTURE_SEED = 12345

// Parse CLI args (Node.js only, ignored in browser)
const args = typeof process !== 'undefined' ? process.argv.slice(2) : []
const opts = {
  json: args.includes('--json'),
  suite: args.find(a => a.startsWith('--suite='))?.split('=')[1] || null,
  compare: args.find(a => a.startsWith('--compare='))?.split('=')[1] || null,
  duration: parseInt(args.find(a => a.startsWith('--duration='))?.split('=')[1] || DEFAULT_DURATION_MS),
  encodeInto: args.includes('--encode-into'),
  // Mode: 'dag-cbor' (default) uses tag 42 + strict options, 'raw' uses plain cborg
  mode: args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'dag-cbor'
}

/**
 * Raw mode CID encoder - just encodes as bytes without tag.
 * Needed because BenchCID has self-reference that triggers circular ref detection.
 */
function rawCidEncoder (obj) {
  if (obj.asCID !== obj && obj['/'] !== obj.bytes) {
    return null
  }
  if (!(obj instanceof BenchCID)) {
    return null
  }
  return [new Token(Type.bytes, obj.bytes)]
}

// Raw mode encode options - minimal, just handles BenchCID
const rawEncodeOptions = {
  typeEncoders: {
    Object: rawCidEncoder
  }
}

// Raw mode with ignoreUndefinedProperties for Bluesky data
const rawBskyEncodeOptions = {
  ignoreUndefinedProperties: true,
  typeEncoders: {
    Object: rawCidEncoder
  }
}

/**
 * Get encode/decode options based on mode and suite type
 * @param {'bsky'|'default'} suiteType
 */
function getOptions (suiteType = 'default') {
  if (opts.mode === 'raw') {
    return {
      encode: suiteType === 'bsky' ? rawBskyEncodeOptions : rawEncodeOptions,
      decode: {}
    }
  }
  return {
    encode: suiteType === 'bsky' ? bskyEncodeOptions : dagCborEncodeOptions,
    decode: dagCborDecodeOptions
  }
}

// Output helpers
const log = opts.json ? () => {} : console.log.bind(console)
const write = typeof process !== 'undefined' && process.stdout
  ? (s) => process.stdout.write(s)
  : (s) => log(s)

/**
 * Run a benchmark function for a duration, return ops/sec
 */
function bench (fn, durationMs = opts.duration) {
  // Warmup
  for (let i = 0; i < WARMUP_ITERATIONS; i++) fn()

  // Measure
  const start = performance.now()
  let ops = 0
  while (performance.now() - start < durationMs) {
    fn()
    ops++
  }
  const elapsed = performance.now() - start
  return {
    opsPerSec: Math.round(ops / (elapsed / 1000)),
    totalOps: ops,
    elapsedMs: Math.round(elapsed)
  }
}

/**
 * Benchmark a fixture set for encode and decode
 * @param {string} name
 * @param {any[]} fixtures
 * @param {'bsky'|'default'} suiteType - determines which encode options to use
 */
function benchFixtures (name, fixtures, suiteType = 'default') {
  const { encode: encodeOptions, decode: decodeOptions } = getOptions(suiteType)

  // Pre-encode all fixtures for decode benchmark
  const encoded = fixtures.map(f => encode(f, encodeOptions))
  const totalBytes = encoded.reduce((sum, b) => sum + b.length, 0)
  const avgBytes = Math.round(totalBytes / encoded.length)

  // Setup encodeInto if requested
  let encodeFn = (f) => encode(f, encodeOptions)
  if (opts.encodeInto) {
    const dest = new Uint8Array(1024 * 1024) // 1MB buffer
    encodeFn = (f) => encodeInto(f, dest, encodeOptions)
  }

  log(`  ${name} (${fixtures.length} items, avg ${avgBytes} bytes)`)

  // Encode benchmark
  write('    encode: ')
  const encResult = bench(() => {
    for (const f of fixtures) encodeFn(f)
  })
  const encOpsPerItem = encResult.opsPerSec * fixtures.length
  const encMBps = Math.round((encResult.opsPerSec * totalBytes) / (1024 * 1024) * 10) / 10
  log(`${encOpsPerItem.toLocaleString()} items/s (${encMBps} MB/s)`)

  // Decode benchmark
  write('    decode: ')
  const decResult = bench(() => {
    for (const e of encoded) decode(e, decodeOptions)
  })
  const decOpsPerItem = decResult.opsPerSec * encoded.length
  const decMBps = Math.round((decResult.opsPerSec * totalBytes) / (1024 * 1024) * 10) / 10
  log(`${decOpsPerItem.toLocaleString()} items/s (${decMBps} MB/s)`)

  return {
    name,
    count: fixtures.length,
    avgBytes,
    totalBytes,
    encode: {
      opsPerSec: encResult.opsPerSec,
      itemsPerSec: encOpsPerItem,
      mbPerSec: encMBps
    },
    decode: {
      opsPerSec: decResult.opsPerSec,
      itemsPerSec: decOpsPerItem,
      mbPerSec: decMBps
    }
  }
}

/**
 * Run a suite of benchmarks
 * @param {string} name
 * @param {Object} fixtureGroups
 * @param {'bsky'|'default'} suiteType
 */
function runSuite (name, fixtureGroups, suiteType = 'default') {
  log(`\n${name}`)
  log('='.repeat(name.length))

  const results = []
  for (const [groupName, fixtures] of Object.entries(fixtureGroups)) {
    if (Array.isArray(fixtures) && fixtures.length > 0) {
      results.push(benchFixtures(groupName, fixtures, suiteType))
    }
  }
  return { suite: name, results }
}

/**
 * Main benchmark runner
 */
async function main () {
  log('Generating fixtures...')
  const fixtures = generateFixtures(FIXTURE_SEED)
  const modeDesc = opts.mode === 'raw' ? 'raw cborg (no tags)' : 'dag-cbor mode (tag 42 + strict)'
  log(`Done. Running benchmarks in ${modeDesc} (${opts.duration}ms per test)...\n`)

  const allResults = []

  // Bluesky suite (string-heavy) - uses ignoreUndefinedProperties
  if (!opts.suite || opts.suite === 'bsky') {
    allResults.push(runSuite('Bluesky (string-heavy)', {
      posts: fixtures.bsky.posts,
      follows: fixtures.bsky.follows,
      likes: fixtures.bsky.likes,
      reposts: fixtures.bsky.reposts,
      profiles: fixtures.bsky.profiles,
      mstNodes: fixtures.bsky.mstNodes
    }, 'bsky'))
  }

  // Filecoin suite (bytes-heavy)
  if (!opts.suite || opts.suite === 'filecoin') {
    allResults.push(runSuite('Filecoin (bytes-heavy)', {
      messages: fixtures.filecoin.messages,
      blockHeaders: fixtures.filecoin.blockHeaders,
      hamtNodes: fixtures.filecoin.hamtNodes,
      amtNodes: fixtures.filecoin.amtNodes,
      cidArrays: fixtures.filecoin.cidArrays
    }))
  }

  // Micro-benchmarks
  if (!opts.suite || opts.suite === 'micro') {
    allResults.push(runSuite('Maps (key sorting)', {
      'small (10 keys)': fixtures.micro.mapsSmall,
      'medium (50 keys)': fixtures.micro.mapsMedium,
      'large (200 keys)': fixtures.micro.mapsLarge
    }))

    allResults.push(runSuite('Nesting depth', {
      'shallow (depth 3)': fixtures.micro.nestedShallow,
      'deep (depth 10)': fixtures.micro.nestedDeep
    }))

    allResults.push(runSuite('Strings', {
      'short (5-20 chars)': fixtures.micro.stringsShort,
      'medium (20-100 chars)': fixtures.micro.stringsMedium,
      'long (100-500 chars)': fixtures.micro.stringsLong
    }))

    allResults.push(runSuite('Integers', {
      'small (0-23)': fixtures.micro.integersSmall,
      'medium (0-65535)': fixtures.micro.integersMedium,
      'large (64-bit)': fixtures.micro.integersLarge
    }))

    allResults.push(runSuite('Bytes', {
      'small (<64)': fixtures.micro.bytesSmall,
      'medium (64-512)': fixtures.micro.bytesMedium,
      'large (1KB+)': fixtures.micro.bytesLarge
    }))
  }

  // Summary
  log('\n' + '='.repeat(50))
  const allEncodeRates = allResults.flatMap(s => s.results.map(r => r.encode.mbPerSec))
  const allDecodeRates = allResults.flatMap(s => s.results.map(r => r.decode.mbPerSec))
  const avgEncode = Math.round(allEncodeRates.reduce((a, b) => a + b, 0) / allEncodeRates.length * 10) / 10
  const avgDecode = Math.round(allDecodeRates.reduce((a, b) => a + b, 0) / allDecodeRates.length * 10) / 10
  log(`Average throughput: encode ${avgEncode} MB/s, decode ${avgDecode} MB/s`)

  // JSON output
  if (opts.json) {
    const output = {
      timestamp: new Date().toISOString(),
      seed: FIXTURE_SEED,
      duration: opts.duration,
      mode: opts.mode,
      encodeInto: opts.encodeInto,
      suites: allResults,
      summary: { avgEncodeMBps: avgEncode, avgDecodeMBps: avgDecode }
    }
    console.log(JSON.stringify(output, null, 2))
  }

  // Compare to baseline
  if (opts.compare) {
    await compareToBaseline(opts.compare, allResults)
  }

  return allResults
}

/**
 * Compare results to a baseline file
 */
async function compareToBaseline (baselinePath, currentResults) {
  let baseline
  try {
    if (typeof process !== 'undefined') {
      const fs = await import('fs')
      baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
    } else {
      const response = await fetch(baselinePath)
      baseline = await response.json()
    }
  } catch (e) {
    log(`\nCould not load baseline: ${e.message}`)
    return
  }

  log('\nComparison to baseline:')
  log('-'.repeat(50))

  for (const suite of currentResults) {
    const baselineSuite = baseline.suites.find(s => s.suite === suite.suite)
    if (!baselineSuite) continue

    log(`\n${suite.suite}:`)
    for (const result of suite.results) {
      const baselineResult = baselineSuite.results.find(r => r.name === result.name)
      if (!baselineResult) continue

      const encDiff = ((result.encode.mbPerSec - baselineResult.encode.mbPerSec) / baselineResult.encode.mbPerSec * 100).toFixed(1)
      const decDiff = ((result.decode.mbPerSec - baselineResult.decode.mbPerSec) / baselineResult.decode.mbPerSec * 100).toFixed(1)
      const encSign = encDiff >= 0 ? '+' : ''
      const decSign = decDiff >= 0 ? '+' : ''

      log(`  ${result.name}: encode ${encSign}${encDiff}%, decode ${decSign}${decDiff}%`)
    }
  }
}

// Run
main().catch(console.error)
