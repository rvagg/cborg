/*
cborg/extended provides built-in support for extended JavaScript types.

Compare this to example-bytestrings.js which manually implements TypedArray support
in ~150 lines. With cborg/extended, it's just import and use.

The type support is similar to the browser's structured clone algorithm - Date, Map,
Set, RegExp, BigInt, Error, and all TypedArrays round-trip with full type fidelity.
*/

import { encode, decode } from 'cborg/extended'

// All these types "just work" - no configuration needed
const original = {
  // Date with millisecond precision
  timestamp: new Date('2024-01-15T12:30:45.123Z'),

  // RegExp with flags
  pattern: /hello\s+world/gi,

  // Map with non-string keys (impossible in JSON)
  lookup: new Map([
    ['string-key', 'string value'],
    [42, 'number key'],
    [true, 'boolean key']
  ]),

  // Set (not just array)
  uniqueIds: new Set([1, 2, 3, 2, 1]), // duplicates removed

  // BigInt (JSON throws on these)
  bigNumber: 9007199254740993n, // beyond Number.MAX_SAFE_INTEGER

  // Error types preserve their class and message
  error: new TypeError('something went wrong'),

  // TypedArrays preserve their exact type
  floats: new Float32Array([1.5, 2.5, 3.5]),
  integers: new Int16Array([-32768, 0, 32767]),
  bigInts: new BigUint64Array([0n, 18446744073709551615n]),

  // Negative zero is preserved (JSON and base cborg lose the sign)
  negativeZero: -0
}

console.log('Original:')
console.log(original)
console.log()

// Encode to CBOR bytes
const encoded = encode(original)
console.log('Encoded size:', encoded.length, 'bytes')
console.log()

// Decode back - all types preserved
// By default, plain objects stay as plain objects (useMaps: false)
const decoded = decode(encoded)
console.log('Decoded:')
console.log(decoded)
console.log()

// Verify types are preserved
console.log('Type checks:')
console.log('  timestamp is Date:', decoded.timestamp instanceof Date)
console.log('  pattern is RegExp:', decoded.pattern instanceof RegExp)
console.log('  lookup is Map:', decoded.lookup instanceof Map)
console.log('  uniqueIds is Set:', decoded.uniqueIds instanceof Set)
console.log('  bigNumber is bigint:', typeof decoded.bigNumber === 'bigint')
console.log('  error is TypeError:', decoded.error instanceof TypeError)
console.log('  floats is Float32Array:', decoded.floats instanceof Float32Array)
console.log('  integers is Int16Array:', decoded.integers instanceof Int16Array)
console.log('  bigInts is BigUint64Array:', decoded.bigInts instanceof BigUint64Array)
console.log('  negativeZero is -0:', Object.is(decoded.negativeZero, -0))
console.log()

// Maps with non-string keys work correctly
console.log('Map key types preserved:')
console.log('  lookup.get(42):', decoded.lookup.get(42))
console.log('  lookup.get(true):', decoded.lookup.get(true))

/* Expected output:

Original:
{
  timestamp: 2024-01-15T12:30:45.123Z,
  pattern: /hello\s+world/gi,
  lookup: Map(3) { 'string-key' => 'string value', 42 => 'number key', true => 'boolean key' },
  uniqueIds: Set(3) { 1, 2, 3 },
  bigNumber: 9007199254740993n,
  error: TypeError: something went wrong,
  floats: Float32Array(3) [ 1.5, 2.5, 3.5 ],
  integers: Int16Array(3) [ -32768, 0, 32767 ],
  bigInts: BigUint64Array(2) [ 0n, 18446744073709551615n ],
  negativeZero: -0
}

Encoded size: ~230 bytes

Decoded:
{
  timestamp: 2024-01-15T12:30:45.123Z,
  pattern: /hello\s+world/gi,
  lookup: Map(3) { 'string-key' => 'string value', 42 => 'number key', true => 'boolean key' },
  ...
}

Type checks:
  timestamp is Date: true
  pattern is RegExp: true
  lookup is Map: true
  uniqueIds is Set: true
  bigNumber is bigint: true
  error is TypeError: true
  floats is Float32Array: true
  integers is Int16Array: true
  bigInts is BigUint64Array: true
  negativeZero is -0: true

Map key types preserved:
  lookup.get(42): number key
  lookup.get(true): boolean key
*/
