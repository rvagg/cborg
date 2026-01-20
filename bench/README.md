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

## Capturing and Comparing Results

### Save a baseline

```bash
# Save results to a file
node bench/bench.js --json > bench/baselines/before-change.json

# Or with a version/date identifier
node bench/bench.js --json > bench/baselines/v4.4.0.json
node bench/bench.js --json > bench/baselines/$(date +%Y%m%d).json
```

### Compare against baseline

```bash
node bench/bench.js --compare=bench/baselines/before-change.json
```

This shows percentage differences for each benchmark.

### Typical workflow

1. Capture baseline before making changes:
   ```bash
   node bench/bench.js --json > bench/baselines/before.json
   ```

2. Make your changes to cborg

3. Compare:
   ```bash
   node bench/bench.js --compare=bench/baselines/before.json
   ```

4. Optionally save the new results:
   ```bash
   node bench/bench.js --json > bench/baselines/after.json
   ```

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

- `bench.js` - Main benchmark runner (Node.js)
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
