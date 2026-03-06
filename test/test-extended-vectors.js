/* eslint-env mocha */

/**
 * Test vectors for cborg/extended tag encoders/decoders
 *
 * Sources:
 * - RFC 8949 Appendix A (Date tags 0, 1)
 * - RFC 8746 (TypedArray tags 64-87)
 * - CBOR Sets Spec: https://github.com/input-output-hk/cbor-sets-spec (Tag 258)
 * - CBOR Map Spec: https://github.com/shanewholloway/js-cbor-codec (Tag 259)
 */

import * as chai from 'chai'
import { encode, decode } from '../lib/extended/extended.js'
import { fromHex, toHex } from '../lib/byte-utils.js'

const { assert } = chai

describe('cborg/extended test vectors', () => {
  describe('Tag 1 - Date (RFC 8949 Appendix A)', () => {
    it('decodes epoch integer: c11a514b67b0 → Date(1363896240000)', () => {
      // From RFC 8949 Appendix A: 1(1363896240)
      const bytes = fromHex('c11a514b67b0')
      const result = decode(bytes)
      assert.ok(result instanceof Date)
      assert.strictEqual(result.getTime(), 1363896240000)
    })

    it('decodes epoch float: c1fb41d452d9ec200000 → Date(1363896240500)', () => {
      // From RFC 8949 Appendix A: 1(1363896240.5)
      const bytes = fromHex('c1fb41d452d9ec200000')
      const result = decode(bytes)
      assert.ok(result instanceof Date)
      assert.strictEqual(result.getTime(), 1363896240500)
    })

    it('round-trips date with millisecond precision', () => {
      const date = new Date(1363896240500) // 2013-03-21T20:04:00.500Z
      const encoded = encode(date)
      const decoded = decode(encoded)
      assert.strictEqual(decoded.getTime(), date.getTime())
    })
  })

  describe('Tag 2/3 - BigInt (RFC 8949)', () => {
    it('decodes positive bigint: c249010000000000000000 → 2^64', () => {
      // Tag 2 with bytes for 2^64
      const bytes = fromHex('c249010000000000000000')
      const result = decode(bytes)
      assert.strictEqual(typeof result, 'bigint')
      assert.strictEqual(result, BigInt('18446744073709551616'))
    })

    it('decodes negative bigint: c349010000000000000000 → -(2^64 + 1)', () => {
      // Tag 3 with bytes for -(2^64 + 1)
      const bytes = fromHex('c349010000000000000000')
      const result = decode(bytes)
      assert.strictEqual(typeof result, 'bigint')
      assert.strictEqual(result, BigInt('-18446744073709551617'))
    })

    it('round-trips large positive bigint', () => {
      const n = BigInt('18446744073709551616') // 2^64
      const encoded = encode(n)
      // Verify it uses tag 2
      assert.strictEqual(encoded[0], 0xc2) // Tag 2
      const decoded = decode(encoded)
      assert.strictEqual(decoded, n)
    })

    it('round-trips large negative bigint', () => {
      const n = BigInt('-18446744073709551617') // -(2^64 + 1)
      const encoded = encode(n)
      // Verify it uses tag 3
      assert.strictEqual(encoded[0], 0xc3) // Tag 3
      const decoded = decode(encoded)
      assert.strictEqual(decoded, n)
    })
  })

  describe('Tag 258 - Set (IANA Registry)', () => {
    it('decodes official vector: d9010283010203 → Set([1, 2, 3])', () => {
      // From https://github.com/input-output-hk/cbor-sets-spec
      const bytes = fromHex('d9010283010203')
      const result = decode(bytes)
      assert.ok(result instanceof Set)
      assert.strictEqual(result.size, 3)
      assert.ok(result.has(1))
      assert.ok(result.has(2))
      assert.ok(result.has(3))
    })

    it('encodes Set([1, 2, 3]) with tag 258', () => {
      const set = new Set([1, 2, 3])
      const encoded = encode(set)
      // First two bytes should be d9 0102 (tag 258)
      assert.strictEqual(encoded[0], 0xd9)
      assert.strictEqual(encoded[1], 0x01)
      assert.strictEqual(encoded[2], 0x02)
    })

    it('round-trips empty set', () => {
      const set = new Set()
      const encoded = encode(set)
      const decoded = decode(encoded)
      assert.ok(decoded instanceof Set)
      assert.strictEqual(decoded.size, 0)
    })
  })

  describe('Tag 259 - Map (IANA Registry)', () => {
    it('decodes official vector: d90103a2626b31627631626b32627632 → Map', () => {
      // From https://github.com/shanewholloway/js-cbor-codec
      // Map with string keys: {k1: v1, k2: v2}
      const bytes = fromHex('d90103a2626b31627631626b32627632')
      const result = decode(bytes)
      assert.ok(result instanceof Map)
      assert.strictEqual(result.get('k1'), 'v1')
      assert.strictEqual(result.get('k2'), 'v2')
    })

    it('encodes Map with tag 259', () => {
      const map = new Map([['k1', 'v1'], ['k2', 'v2']])
      const encoded = encode(map)
      // First two bytes should be d9 0103 (tag 259)
      assert.strictEqual(encoded[0], 0xd9)
      assert.strictEqual(encoded[1], 0x01)
      assert.strictEqual(encoded[2], 0x03)
    })

    it('round-trips map with non-string keys', () => {
      const map = new Map([[42, 'answer'], [true, 'yes']])
      const encoded = encode(map)
      const decoded = decode(encoded)
      assert.ok(decoded instanceof Map)
      assert.strictEqual(decoded.get(42), 'answer')
      assert.strictEqual(decoded.get(true), 'yes')
    })
  })

  describe('Tags 64-87 - TypedArrays (RFC 8746)', () => {
    // RFC 8746 defines tags for typed arrays
    // We use little-endian tags (69, 70, 71, 77, 78, 79, 85, 86) for multi-byte types

    it('Tag 64: Uint8Array round-trips', () => {
      const arr = new Uint8Array([1, 2, 3, 255])
      const encoded = encode(arr)
      assert.strictEqual(encoded[0], 0xd8) // 1-byte tag
      assert.strictEqual(encoded[1], 64) // Tag 64
      const decoded = decode(encoded)
      assert.ok(decoded instanceof Uint8Array)
      assert.deepStrictEqual([...decoded], [1, 2, 3, 255])
    })

    it('Tag 68: Uint8ClampedArray round-trips', () => {
      const arr = new Uint8ClampedArray([0, 128, 255])
      const encoded = encode(arr)
      assert.strictEqual(encoded[0], 0xd8)
      assert.strictEqual(encoded[1], 68)
      const decoded = decode(encoded)
      assert.ok(decoded instanceof Uint8ClampedArray)
      assert.deepStrictEqual([...decoded], [0, 128, 255])
    })

    it('Tag 72: Int8Array round-trips', () => {
      const arr = new Int8Array([-128, 0, 127])
      const encoded = encode(arr)
      assert.strictEqual(encoded[0], 0xd8)
      assert.strictEqual(encoded[1], 72)
      const decoded = decode(encoded)
      assert.ok(decoded instanceof Int8Array)
      assert.deepStrictEqual([...decoded], [-128, 0, 127])
    })

    it('Tag 69: Uint16Array (LE) round-trips', () => {
      const arr = new Uint16Array([0, 256, 65535])
      const encoded = encode(arr)
      assert.strictEqual(encoded[0], 0xd8)
      assert.strictEqual(encoded[1], 69)
      const decoded = decode(encoded)
      assert.ok(decoded instanceof Uint16Array)
      assert.deepStrictEqual([...decoded], [0, 256, 65535])
    })

    it('Tag 77: Int16Array (LE) round-trips', () => {
      const arr = new Int16Array([-32768, 0, 32767])
      const encoded = encode(arr)
      assert.strictEqual(encoded[0], 0xd8)
      assert.strictEqual(encoded[1], 77)
      const decoded = decode(encoded)
      assert.ok(decoded instanceof Int16Array)
      assert.deepStrictEqual([...decoded], [-32768, 0, 32767])
    })

    it('Tag 70: Uint32Array (LE) round-trips', () => {
      const arr = new Uint32Array([0, 65536, 4294967295])
      const encoded = encode(arr)
      assert.strictEqual(encoded[0], 0xd8)
      assert.strictEqual(encoded[1], 70)
      const decoded = decode(encoded)
      assert.ok(decoded instanceof Uint32Array)
      assert.deepStrictEqual([...decoded], [0, 65536, 4294967295])
    })

    it('Tag 78: Int32Array (LE) round-trips', () => {
      const arr = new Int32Array([-2147483648, 0, 2147483647])
      const encoded = encode(arr)
      assert.strictEqual(encoded[0], 0xd8)
      assert.strictEqual(encoded[1], 78)
      const decoded = decode(encoded)
      assert.ok(decoded instanceof Int32Array)
      assert.deepStrictEqual([...decoded], [-2147483648, 0, 2147483647])
    })

    it('Tag 85: Float32Array (LE) round-trips', () => {
      const arr = new Float32Array([1.5, -2.5, 0])
      const encoded = encode(arr)
      assert.strictEqual(encoded[0], 0xd8)
      assert.strictEqual(encoded[1], 85)
      const decoded = decode(encoded)
      assert.ok(decoded instanceof Float32Array)
      assert.strictEqual(decoded[0], 1.5)
      assert.strictEqual(decoded[1], -2.5)
      assert.strictEqual(decoded[2], 0)
    })

    it('Tag 86: Float64Array (LE) round-trips', () => {
      const arr = new Float64Array([Math.PI, -Math.E, Infinity])
      const encoded = encode(arr)
      assert.strictEqual(encoded[0], 0xd8)
      assert.strictEqual(encoded[1], 86)
      const decoded = decode(encoded)
      assert.ok(decoded instanceof Float64Array)
      assert.strictEqual(decoded[0], Math.PI)
      assert.strictEqual(decoded[1], -Math.E)
      assert.strictEqual(decoded[2], Infinity)
    })

    it('Tag 71: BigUint64Array (LE) round-trips', () => {
      const arr = new BigUint64Array([0n, 1n, BigInt('18446744073709551615')])
      const encoded = encode(arr)
      assert.strictEqual(encoded[0], 0xd8)
      assert.strictEqual(encoded[1], 71)
      const decoded = decode(encoded)
      assert.ok(decoded instanceof BigUint64Array)
      assert.deepStrictEqual([...decoded], [0n, 1n, BigInt('18446744073709551615')])
    })

    it('Tag 79: BigInt64Array (LE) round-trips', () => {
      const arr = new BigInt64Array([BigInt('-9223372036854775808'), 0n, BigInt('9223372036854775807')])
      const encoded = encode(arr)
      assert.strictEqual(encoded[0], 0xd8)
      assert.strictEqual(encoded[1], 79)
      const decoded = decode(encoded)
      assert.ok(decoded instanceof BigInt64Array)
      assert.deepStrictEqual([...decoded], [BigInt('-9223372036854775808'), 0n, BigInt('9223372036854775807')])
    })
  })

  describe('cross-implementation compatibility', () => {
    it('generates deterministic output for Set', () => {
      // Sets should encode consistently
      const set = new Set([1, 2, 3])
      const encoded1 = encode(set)
      const encoded2 = encode(set)
      assert.strictEqual(toHex(encoded1), toHex(encoded2))
    })

    it('generates deterministic output for Map', () => {
      // Maps should encode with consistent key ordering
      const map = new Map([['b', 2], ['a', 1]])
      const encoded1 = encode(map)
      const encoded2 = encode(map)
      assert.strictEqual(toHex(encoded1), toHex(encoded2))
    })

    it('handles nested tagged values', () => {
      // A Set containing a Map containing a Date
      const nested = new Set([
        new Map([['created', new Date('2024-01-01T00:00:00Z')]])
      ])
      const encoded = encode(nested)
      const decoded = decode(encoded)

      assert.ok(decoded instanceof Set)
      const innerMap = [...decoded][0]
      assert.ok(innerMap instanceof Map)
      const date = innerMap.get('created')
      assert.ok(date instanceof Date)
      assert.strictEqual(date.toISOString(), '2024-01-01T00:00:00.000Z')
    })
  })
})
