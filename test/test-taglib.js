/* eslint-env mocha */

import * as chai from 'chai'
import { encode, decode } from '../cborg.js'
import {
  // Tag constants
  TAG_DATE_EPOCH,
  TAG_BIGINT_POS,
  TAG_BIGINT_NEG,
  TAG_UINT8_ARRAY,
  TAG_UINT8_CLAMPED_ARRAY,
  TAG_INT8_ARRAY,
  TAG_UINT16_ARRAY_LE,
  TAG_UINT32_ARRAY_LE,
  TAG_BIGUINT64_ARRAY_LE,
  TAG_INT16_ARRAY_LE,
  TAG_INT32_ARRAY_LE,
  TAG_BIGINT64_ARRAY_LE,
  TAG_FLOAT32_ARRAY_LE,
  TAG_FLOAT64_ARRAY_LE,
  TAG_SET,
  TAG_MAP,
  TAG_REGEXP,

  // BigInt
  bigIntEncoder,
  bigIntDecoder,
  bigNegIntDecoder,
  structBigIntEncoder,

  // Date
  dateEncoder,
  dateDecoder,

  // RegExp
  regExpEncoder,
  regExpDecoder,

  // Set
  setEncoder,
  setDecoder,

  // Map
  mapEncoder,
  mapDecoder,

  // TypedArrays
  uint8ArrayEncoder,
  uint8ArrayDecoder,
  uint8ClampedArrayEncoder,
  uint8ClampedArrayDecoder,
  int8ArrayEncoder,
  int8ArrayDecoder,
  uint16ArrayEncoder,
  uint16ArrayDecoder,
  uint32ArrayEncoder,
  uint32ArrayDecoder,
  bigUint64ArrayEncoder,
  bigUint64ArrayDecoder,
  int16ArrayEncoder,
  int16ArrayDecoder,
  int32ArrayEncoder,
  int32ArrayDecoder,
  bigInt64ArrayEncoder,
  bigInt64ArrayDecoder,
  float32ArrayEncoder,
  float32ArrayDecoder,
  float64ArrayEncoder,
  float64ArrayDecoder
} from '../lib/taglib.js'

const { assert } = chai

/**
 * Create a mock decode control for unit testing decoders
 * @param {any} value - The value that decode() should return
 * @param {Array<[any, any]>} [entries] - Optional entries for decode.entries()
 * @returns {import('../interface').TagDecodeControl}
 */
function mockDecode (value, entries) {
  const fn = () => value
  fn.entries = () => entries || []
  return fn
}

describe('taglib', () => {
  describe('tag constants', () => {
    it('has correct standard tag values', () => {
      assert.strictEqual(TAG_DATE_EPOCH, 1)
      assert.strictEqual(TAG_BIGINT_POS, 2)
      assert.strictEqual(TAG_BIGINT_NEG, 3)
    })

    it('has correct TypedArray tag values', () => {
      assert.strictEqual(TAG_UINT8_ARRAY, 64)
      assert.strictEqual(TAG_UINT8_CLAMPED_ARRAY, 68)
      assert.strictEqual(TAG_INT8_ARRAY, 72)
      assert.strictEqual(TAG_UINT16_ARRAY_LE, 69)
      assert.strictEqual(TAG_UINT32_ARRAY_LE, 70)
      assert.strictEqual(TAG_BIGUINT64_ARRAY_LE, 71)
      assert.strictEqual(TAG_INT16_ARRAY_LE, 77)
      assert.strictEqual(TAG_INT32_ARRAY_LE, 78)
      assert.strictEqual(TAG_BIGINT64_ARRAY_LE, 79)
      assert.strictEqual(TAG_FLOAT32_ARRAY_LE, 85)
      assert.strictEqual(TAG_FLOAT64_ARRAY_LE, 86)
    })

    it('has correct extended tag values', () => {
      assert.strictEqual(TAG_SET, 258)
      assert.strictEqual(TAG_MAP, 259)
      assert.strictEqual(TAG_REGEXP, 21066)
    })
  })

  describe('BigInt', () => {
    describe('bigIntDecoder', () => {
      it('decodes zero', () => {
        assert.strictEqual(bigIntDecoder(mockDecode(new Uint8Array([0]))), 0n)
      })

      it('decodes small positive', () => {
        assert.strictEqual(bigIntDecoder(mockDecode(new Uint8Array([100]))), 100n)
      })

      it('decodes large positive', () => {
        // 0x0100000000000000 = 72057594037927936
        assert.strictEqual(
          bigIntDecoder(mockDecode(new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]))),
          72057594037927936n
        )
      })
    })

    describe('bigNegIntDecoder', () => {
      it('decodes -1', () => {
        assert.strictEqual(bigNegIntDecoder(mockDecode(new Uint8Array([0]))), -1n)
      })

      it('decodes negative', () => {
        // -1 - 100 = -101
        assert.strictEqual(bigNegIntDecoder(mockDecode(new Uint8Array([100]))), -101n)
      })
    })

    describe('bigIntEncoder (IPLD compatible)', () => {
      it('returns null for small values (within 64-bit range)', () => {
        assert.strictEqual(bigIntEncoder(0n), null)
        assert.strictEqual(bigIntEncoder(100n), null)
        assert.strictEqual(bigIntEncoder(-100n), null)
        assert.strictEqual(bigIntEncoder(BigInt('18446744073709551615')), null)
        assert.strictEqual(bigIntEncoder(BigInt('-18446744073709551616')), null)
      })

      it('returns tokens for large positive values', () => {
        const tokens = bigIntEncoder(BigInt('18446744073709551616'))
        assert.ok(Array.isArray(tokens))
        assert.strictEqual(tokens[0].value, TAG_BIGINT_POS)
      })

      it('returns tokens for large negative values', () => {
        const tokens = bigIntEncoder(BigInt('-18446744073709551617'))
        assert.ok(Array.isArray(tokens))
        assert.strictEqual(tokens[0].value, TAG_BIGINT_NEG)
      })
    })

    describe('structBigIntEncoder (always tags)', () => {
      it('returns tokens for zero', () => {
        const tokens = structBigIntEncoder(0n)
        assert.ok(Array.isArray(tokens))
        assert.strictEqual(tokens[0].value, TAG_BIGINT_POS)
      })

      it('returns tokens for small positive', () => {
        const tokens = structBigIntEncoder(100n)
        assert.ok(Array.isArray(tokens))
        assert.strictEqual(tokens[0].value, TAG_BIGINT_POS)
      })

      it('returns tokens for small negative', () => {
        const tokens = structBigIntEncoder(-1n)
        assert.ok(Array.isArray(tokens))
        assert.strictEqual(tokens[0].value, TAG_BIGINT_NEG)
      })
    })

    describe('round-trip via encode/decode', () => {
      const opts = {
        typeEncoders: { bigint: structBigIntEncoder },
        tags: { [TAG_BIGINT_POS]: bigIntDecoder, [TAG_BIGINT_NEG]: bigNegIntDecoder }
      }

      it('round-trips 0n', () => {
        const result = decode(encode(0n, opts), opts)
        assert.strictEqual(typeof result, 'bigint')
        assert.strictEqual(result, 0n)
      })

      it('round-trips 100n', () => {
        const result = decode(encode(100n, opts), opts)
        assert.strictEqual(typeof result, 'bigint')
        assert.strictEqual(result, 100n)
      })

      it('round-trips -1n', () => {
        const result = decode(encode(-1n, opts), opts)
        assert.strictEqual(typeof result, 'bigint')
        assert.strictEqual(result, -1n)
      })

      it('round-trips large positive', () => {
        const n = BigInt('9007199254740993')
        const result = decode(encode(n, opts), opts)
        assert.strictEqual(result, n)
      })

      it('round-trips large negative', () => {
        const n = BigInt('-18446744073709551617')
        const result = decode(encode(n, opts), opts)
        assert.strictEqual(result, n)
      })
    })
  })

  describe('Date', () => {
    describe('dateEncoder', () => {
      it('returns tag 1 with float seconds', () => {
        const tokens = dateEncoder(new Date(1000))
        assert.strictEqual(tokens[0].value, TAG_DATE_EPOCH)
        assert.strictEqual(tokens[1].value, 1) // 1000ms = 1 second
      })

      it('handles milliseconds', () => {
        const tokens = dateEncoder(new Date(1500))
        assert.strictEqual(tokens[1].value, 1.5)
      })

      it('handles epoch', () => {
        const tokens = dateEncoder(new Date(0))
        assert.strictEqual(tokens[1].value, 0)
      })
    })

    describe('dateDecoder', () => {
      it('decodes seconds to Date', () => {
        const date = dateDecoder(mockDecode(1))
        assert.ok(date instanceof Date)
        assert.strictEqual(date.getTime(), 1000)
      })

      it('decodes float seconds', () => {
        const date = dateDecoder(mockDecode(1.5))
        assert.strictEqual(date.getTime(), 1500)
      })
    })

    describe('round-trip via encode/decode', () => {
      const opts = {
        typeEncoders: { Date: dateEncoder },
        tags: { [TAG_DATE_EPOCH]: dateDecoder }
      }

      it('round-trips a date', () => {
        const d = new Date('2024-01-15T12:30:00.000Z')
        const result = decode(encode(d, opts), opts)
        assert.ok(result instanceof Date)
        assert.strictEqual(result.getTime(), d.getTime())
      })

      it('round-trips date with milliseconds', () => {
        const d = new Date('2024-01-15T12:30:00.123Z')
        const result = decode(encode(d, opts), opts)
        assert.strictEqual(result.getTime(), d.getTime())
      })

      it('round-trips epoch date', () => {
        const d = new Date(0)
        const result = decode(encode(d, opts), opts)
        assert.strictEqual(result.getTime(), 0)
      })
    })
  })

  describe('RegExp', () => {
    describe('regExpEncoder', () => {
      it('encodes pattern without flags', () => {
        const tokens = regExpEncoder(/foo/)
        assert.strictEqual(tokens[0].value, TAG_REGEXP)
        assert.strictEqual(tokens[1].value, 1) // array length 1
        assert.strictEqual(tokens[2].value, 'foo')
      })

      it('encodes pattern with flags', () => {
        const tokens = regExpEncoder(/foo/gi)
        assert.strictEqual(tokens[0].value, TAG_REGEXP)
        assert.strictEqual(tokens[1].value, 2) // array length 2
        assert.strictEqual(tokens[2].value, 'foo')
        assert.strictEqual(tokens[3].value, 'gi')
      })
    })

    describe('regExpDecoder', () => {
      it('decodes array with pattern only', () => {
        const re = regExpDecoder(mockDecode(['foo']))
        assert.ok(re instanceof RegExp)
        assert.strictEqual(re.source, 'foo')
        assert.strictEqual(re.flags, '')
      })

      it('decodes array with pattern and flags', () => {
        const re = regExpDecoder(mockDecode(['foo', 'gi']))
        assert.strictEqual(re.source, 'foo')
        assert.strictEqual(re.flags, 'gi')
      })
    })

    describe('round-trip via encode/decode', () => {
      const opts = {
        typeEncoders: { RegExp: regExpEncoder },
        tags: { [TAG_REGEXP]: regExpDecoder }
      }

      it('round-trips pattern without flags', () => {
        const re = /foo.*bar/
        const result = decode(encode(re, opts), opts)
        assert.ok(result instanceof RegExp)
        assert.strictEqual(result.source, re.source)
        assert.strictEqual(result.flags, re.flags)
      })

      it('round-trips pattern with flags', () => {
        const re = /foo.*bar/gim
        const result = decode(encode(re, opts), opts)
        assert.strictEqual(result.source, re.source)
        assert.strictEqual(result.flags, re.flags)
      })

      it('round-trips empty pattern', () => {
        const re = /(?:)/
        const result = decode(encode(re, opts), opts)
        assert.strictEqual(result.source, '(?:)')
      })
    })
  })

  describe('Set', () => {
    describe('setEncoder', () => {
      it('encodes empty set', () => {
        const tokens = setEncoder(new Set(), 'Set', {})
        assert.strictEqual(tokens[0].value, TAG_SET)
        assert.strictEqual(tokens[1].value, 0) // array length 0
      })
    })

    describe('setDecoder', () => {
      it('decodes array to Set', () => {
        const s = setDecoder(mockDecode([1, 2, 3]))
        assert.ok(s instanceof Set)
        assert.strictEqual(s.size, 3)
        assert.ok(s.has(1))
        assert.ok(s.has(2))
        assert.ok(s.has(3))
      })
    })

    describe('round-trip via encode/decode', () => {
      const opts = {
        typeEncoders: { Set: setEncoder },
        tags: { [TAG_SET]: setDecoder }
      }

      it('round-trips empty set', () => {
        const s = new Set()
        const result = decode(encode(s, opts), opts)
        assert.ok(result instanceof Set)
        assert.strictEqual(result.size, 0)
      })

      it('round-trips set with primitives', () => {
        const s = new Set([1, 2, 3, 'a', 'b'])
        const result = decode(encode(s, opts), opts)
        assert.ok(result instanceof Set)
        assert.strictEqual(result.size, 5)
        assert.ok(result.has(1))
        assert.ok(result.has('a'))
      })

      it('round-trips set with nested objects', () => {
        const s = new Set([{ x: 1 }, { y: 2 }])
        const result = decode(encode(s, opts), opts)
        assert.strictEqual(result.size, 2)
        const arr = [...result]
        assert.deepStrictEqual(arr[0], { x: 1 })
        assert.deepStrictEqual(arr[1], { y: 2 })
      })
    })
  })

  describe('Map (Tag 259)', () => {
    describe('mapEncoder', () => {
      it('encodes empty map', () => {
        const tokens = mapEncoder(new Map(), 'Map', {})
        assert.strictEqual(tokens[0].value, TAG_MAP)
        assert.strictEqual(tokens[1].value, 0) // map length 0
      })
    })

    describe('mapDecoder', () => {
      it('decodes entries as Map', () => {
        const result = mapDecoder(mockDecode(null, [['a', 1]]))
        assert.ok(result instanceof Map)
        assert.strictEqual(result.get('a'), 1)
      })

      it('decodes multiple entries as Map', () => {
        const result = mapDecoder(mockDecode(null, [['a', 1], ['b', 2]]))
        assert.ok(result instanceof Map)
        assert.strictEqual(result.get('a'), 1)
        assert.strictEqual(result.get('b'), 2)
      })

      it('preserves non-string keys', () => {
        const result = mapDecoder(mockDecode(null, [[1, 'one'], [2, 'two']]))
        assert.ok(result instanceof Map)
        assert.strictEqual(result.get(1), 'one')
        assert.strictEqual(result.get(2), 'two')
      })
    })

    describe('round-trip via encode/decode', () => {
      const opts = {
        typeEncoders: { Map: mapEncoder },
        tags: { [TAG_MAP]: mapDecoder }
        // useMaps not needed - mapDecoder uses decode.entries() to preserve key types
      }

      it('round-trips empty map', () => {
        const m = new Map()
        const result = decode(encode(m, opts), opts)
        assert.ok(result instanceof Map)
        assert.strictEqual(result.size, 0)
      })

      it('round-trips map with string keys', () => {
        const m = new Map([['a', 1], ['b', 2]])
        const result = decode(encode(m, opts), opts)
        assert.ok(result instanceof Map)
        assert.strictEqual(result.get('a'), 1)
        assert.strictEqual(result.get('b'), 2)
      })

      it('round-trips map with number keys', () => {
        const m = new Map([[1, 'one'], [2, 'two']])
        const result = decode(encode(m, opts), opts)
        assert.ok(result instanceof Map)
        assert.strictEqual(result.get(1), 'one')
        assert.strictEqual(result.get(2), 'two')
      })
    })
  })

  describe('TypedArrays', () => {
    describe('Uint8Array', () => {
      const opts = {
        typeEncoders: { Uint8Array: uint8ArrayEncoder },
        tags: { [TAG_UINT8_ARRAY]: uint8ArrayDecoder }
      }

      it('encodes with tag 64', () => {
        const tokens = uint8ArrayEncoder(new Uint8Array([1, 2, 3]))
        assert.strictEqual(tokens[0].value, TAG_UINT8_ARRAY)
      })

      it('round-trips', () => {
        const arr = new Uint8Array([1, 2, 3, 4, 5])
        const result = decode(encode(arr, opts), opts)
        assert.ok(result instanceof Uint8Array)
        assert.deepStrictEqual([...result], [1, 2, 3, 4, 5])
      })

      it('round-trips view of larger buffer', () => {
        const buffer = new ArrayBuffer(100)
        const view = new Uint8Array(buffer, 10, 5)
        view.set([1, 2, 3, 4, 5])
        const result = decode(encode(view, opts), opts)
        assert.strictEqual(result.length, 5)
        assert.deepStrictEqual([...result], [1, 2, 3, 4, 5])
      })
    })

    describe('Uint8ClampedArray', () => {
      const opts = {
        typeEncoders: { Uint8ClampedArray: uint8ClampedArrayEncoder },
        tags: { [TAG_UINT8_CLAMPED_ARRAY]: uint8ClampedArrayDecoder }
      }

      it('round-trips', () => {
        const arr = new Uint8ClampedArray([0, 128, 255])
        const result = decode(encode(arr, opts), opts)
        assert.ok(result instanceof Uint8ClampedArray)
        assert.deepStrictEqual([...result], [0, 128, 255])
      })
    })

    describe('Int8Array', () => {
      const opts = {
        typeEncoders: { Int8Array: int8ArrayEncoder },
        tags: { [TAG_INT8_ARRAY]: int8ArrayDecoder }
      }

      it('round-trips', () => {
        const arr = new Int8Array([-128, 0, 127])
        const result = decode(encode(arr, opts), opts)
        assert.ok(result instanceof Int8Array)
        assert.deepStrictEqual([...result], [-128, 0, 127])
      })
    })

    describe('Uint16Array', () => {
      const opts = {
        typeEncoders: { Uint16Array: uint16ArrayEncoder },
        tags: { [TAG_UINT16_ARRAY_LE]: uint16ArrayDecoder }
      }

      it('round-trips', () => {
        const arr = new Uint16Array([0, 256, 65535])
        const result = decode(encode(arr, opts), opts)
        assert.ok(result instanceof Uint16Array)
        assert.deepStrictEqual([...result], [0, 256, 65535])
      })
    })

    describe('Uint32Array', () => {
      const opts = {
        typeEncoders: { Uint32Array: uint32ArrayEncoder },
        tags: { [TAG_UINT32_ARRAY_LE]: uint32ArrayDecoder }
      }

      it('round-trips', () => {
        const arr = new Uint32Array([0, 65536, 4294967295])
        const result = decode(encode(arr, opts), opts)
        assert.ok(result instanceof Uint32Array)
        assert.deepStrictEqual([...result], [0, 65536, 4294967295])
      })
    })

    describe('Int16Array', () => {
      const opts = {
        typeEncoders: { Int16Array: int16ArrayEncoder },
        tags: { [TAG_INT16_ARRAY_LE]: int16ArrayDecoder }
      }

      it('round-trips', () => {
        const arr = new Int16Array([-32768, 0, 32767])
        const result = decode(encode(arr, opts), opts)
        assert.ok(result instanceof Int16Array)
        assert.deepStrictEqual([...result], [-32768, 0, 32767])
      })
    })

    describe('Int32Array', () => {
      const opts = {
        typeEncoders: { Int32Array: int32ArrayEncoder },
        tags: { [TAG_INT32_ARRAY_LE]: int32ArrayDecoder }
      }

      it('round-trips', () => {
        const arr = new Int32Array([-2147483648, 0, 2147483647])
        const result = decode(encode(arr, opts), opts)
        assert.ok(result instanceof Int32Array)
        assert.deepStrictEqual([...result], [-2147483648, 0, 2147483647])
      })
    })

    describe('Float32Array', () => {
      const opts = {
        typeEncoders: { Float32Array: float32ArrayEncoder },
        tags: { [TAG_FLOAT32_ARRAY_LE]: float32ArrayDecoder }
      }

      it('round-trips', () => {
        const arr = new Float32Array([1.5, -2.5, 3.14])
        const result = decode(encode(arr, opts), opts)
        assert.ok(result instanceof Float32Array)
        // Float32 has limited precision
        assert.strictEqual(result[0], 1.5)
        assert.strictEqual(result[1], -2.5)
        assert.ok(Math.abs(result[2] - 3.14) < 0.001)
      })
    })

    describe('Float64Array', () => {
      const opts = {
        typeEncoders: { Float64Array: float64ArrayEncoder },
        tags: { [TAG_FLOAT64_ARRAY_LE]: float64ArrayDecoder }
      }

      it('round-trips', () => {
        const arr = new Float64Array([1.1, -2.2, Math.PI, Infinity, -Infinity])
        const result = decode(encode(arr, opts), opts)
        assert.ok(result instanceof Float64Array)
        assert.deepStrictEqual([...result], [1.1, -2.2, Math.PI, Infinity, -Infinity])
      })
    })

    describe('BigUint64Array', () => {
      const opts = {
        typeEncoders: { BigUint64Array: bigUint64ArrayEncoder },
        tags: { [TAG_BIGUINT64_ARRAY_LE]: bigUint64ArrayDecoder }
      }

      it('round-trips', () => {
        const arr = new BigUint64Array([0n, 1n, BigInt('18446744073709551615')])
        const result = decode(encode(arr, opts), opts)
        assert.ok(result instanceof BigUint64Array)
        assert.deepStrictEqual([...result], [0n, 1n, BigInt('18446744073709551615')])
      })
    })

    describe('BigInt64Array', () => {
      const opts = {
        typeEncoders: { BigInt64Array: bigInt64ArrayEncoder },
        tags: { [TAG_BIGINT64_ARRAY_LE]: bigInt64ArrayDecoder }
      }

      it('round-trips', () => {
        const arr = new BigInt64Array([BigInt('-9223372036854775808'), 0n, BigInt('9223372036854775807')])
        const result = decode(encode(arr, opts), opts)
        assert.ok(result instanceof BigInt64Array)
        assert.deepStrictEqual([...result], [BigInt('-9223372036854775808'), 0n, BigInt('9223372036854775807')])
      })
    })
  })
})
