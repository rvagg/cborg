# cborg Benchmarks

Benchmarks for measuring cborg encode/decode performance with realistic IPLD workloads.

## Quick Start

```bash
# Run all benchmarks (dag-cbor mode with tag 42 + strict options)
node bench/bench.js

# Run specific suite
node bench/bench.js --suite=bsky       # Bluesky (string-heavy)
node bench/bench.js --suite=filecoin   # Filecoin (bytes-heavy)
node bench/bench.js --suite=micro      # Micro-benchmarks (maps, strings, integers, etc.)

# Run in raw mode (no tags, minimal options) for baseline comparison
node bench/bench.js --mode=raw

# Test encodeInto() performance
node bench/bench.js --encode-into

# Adjust duration per test (default 1000ms)
node bench/bench.js --duration=2000
```

## Browser Benchmarks

Open `bench/index.html` in a browser. Select mode, suite, and duration, then click "Run Benchmarks".

## Comparing a Change

```bash
node bench/compare.js --base-ref=master      # or --base=DIR for another copy
```

Takes about three minutes. Other options: `--rounds`, `--window` (ms),
`--suite`, `--mode`, `--json=FILE`, `--markdown=FILE`.

Base, head and a control (base again) each run in a fresh process per round.
A row is reported as regressed or improved only if its median delta exceeds
`max(3%, 3 x control noise)` and reproduces in extra rounds. Separate
processes matter: two copies of the code in one process gave false
differences of up to 44% on identical code.

Pull requests touching `lib/`, `cborg.js` or `bench/` get the same
comparison as a sticky comment. It is informational and never fails the check.

`bench.js` prints absolute throughput for one tree. Use `compare.js` for
before/after.

## Benchmark Modes

### dag-cbor mode (default)

Simulates `@ipld/dag-cbor` usage:
- CID encoding/decoding via CBOR tag 42
- `float64: true` (always 64-bit floats)
- `strict: true` on decode
- `rejectDuplicateMapKeys: true`
- Bluesky suite uses `ignoreUndefinedProperties: true`
- Filecoin/micro suites throw on undefined (strict IPLD)

### raw mode (`--mode=raw`)

Minimal cborg options for baseline comparison:
- No tag encoding/decoding
- Default encode/decode options
- Shows overhead of dag-cbor-specific features

## Files

- `bench.js` - Absolute throughput runner (Node.js and browser)
- `compare.js` - Base against head comparison in separate processes (Node.js)
- `compare-*.js` - helpers for `compare.js`
- `index.html` - Browser benchmark UI
- `fixtures.js` - Deterministic fixture generators (seeded PRNG)
- `bench-comparative.js` - Historical cborg vs borc comparison
- `json.js` - JSON encode/decode benchmarks

## Fixture Suites

### Bluesky (string-heavy)
- Posts, follows, likes, reposts, profiles
- MST (Merkle Search Tree) nodes
- Heavy on strings, DIDs, AT-URIs, timestamps

### Filecoin (bytes-heavy)
- Messages, block headers
- HAMT and AMT nodes
- CID arrays
- Heavy on byte arrays and CIDs

### Micro-benchmarks
- Maps (small/medium/large key counts)
- Nesting depth (shallow/deep)
- Strings (short/medium/long)
- Integers (small/medium/large)
- Bytes (small/medium/large)
