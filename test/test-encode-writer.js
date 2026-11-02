/* eslint-env mocha */

import * as chai from 'chai'
import { encode, encodeInto, Token, Type } from '../cborg.js'
import { makeCborEncoders, objectToTokens } from '../lib/encode.js'
import { toHex } from '../lib/byte-utils.js'

const { assert } = chai

const cborEncoders = makeCborEncoders()

/**
 * Independent oracle writer: keeps every push as its own chunk and
 * concatenates at the end.
 */
class ChunkWriter {
  constructor () {
    /** @type {number[][]} */
    this.chunks = []
  }

  reset () { this.chunks = [] }
  pushByte (/** @type {number} */ b) { this.chunks.push([b]) }
  push (/** @type {ArrayLike<number>} */ bytes) { this.chunks.push(Array.from(bytes)) }
  pushArr (/** @type {number[]} */ bytes) { this.push(bytes) }
  pushBytes (/** @type {Uint8Array} */ bytes) { this.push(bytes) }
  toBytes () { return Uint8Array.from(this.chunks.flat()) }
}

/**
 * Reference encoder: tokens written to a ChunkWriter. Map keys are not
 * sorted, so inputs must list keys in length-first order.
 * @param {any} data
 * @param {any} [options]
 * @returns {Uint8Array}
 */
function referenceEncode (data, options = {}) {
  const bl = new ChunkWriter()
  const write = (/** @type {any} */ t) => {
    if (Array.isArray(t)) {
      t.forEach(write)
    } else {
      cborEncoders[t.type.major](bl, t, options)
    }
  }
  write(objectToTokens(data, options))
  return bl.toBytes()
}

function assertBytes (/** @type {Uint8Array} */ actual, /** @type {Uint8Array} */ expected, /** @type {string} */ msg = '') {
  assert.strictEqual(actual.length, expected.length, `${msg} length`)
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) assert.fail(`${msg} byte ${i}: ${actual[i]} !== ${expected[i]}`)
  }
}

function bytesOf (/** @type {number} */ n, fill = 0xab) {
  return new Uint8Array(n).fill(fill)
}

// sizes around every writer threshold: header widths, the pass-through
// cutoff, the retain limit and the segment limit
const sizes = [0, 1, 15, 16, 23, 24, 255, 256, 1023, 1024, 1025, 65535, 65536, 65537, 262143, 262144, 262145]

describe('encode default writer', () => {
  describe('output ownership', () => {
    it('returns a plain Uint8Array with an exact-size ArrayBuffer', () => {
      for (const n of [0, 1, 20, 300, 5000, 70000]) {
        for (const value of [bytesOf(n), 'x'.repeat(n), new Array(n).fill(1)]) {
          const out = encode(value)
          assert.strictEqual(Object.getPrototypeOf(out), Uint8Array.prototype)
          assert.strictEqual(out.byteOffset, 0)
          assert.strictEqual(out.buffer.byteLength, out.length)
        }
      }
    })

    it('does not alias a later encode', () => {
      const a = encode({ a: 1 })
      const aHex = toHex(a)
      const b = encode({ b: 2, c: [3, 4, 5] })
      assert.strictEqual(toHex(a), aHex)
      assert.notStrictEqual(a.buffer, b.buffer)
    })

    it('mutating a result does not affect the next encode', () => {
      const first = encode(['abc', 1, 2, 3])
      const expected = toHex(first)
      first.fill(0xff)
      assert.strictEqual(toHex(encode(['abc', 1, 2, 3])), expected)
    })

    it('mutating a result does not affect the input bytes', () => {
      const input = bytesOf(5000, 7)
      const out = encode(input)
      out.fill(0)
      assert.deepEqual(input, bytesOf(5000, 7))
    })

    it('does not alias large byte inputs', () => {
      const input = bytesOf(5000, 7)
      const out = encode(input)
      assert.notStrictEqual(out.buffer, input.buffer)
      input.fill(0)
      assert.strictEqual(out[out.length - 1], 7)
    })
  })

  describe('byte arrays', () => {
    for (const n of sizes) {
      it(`bytes of ${n}`, () => {
        const value = Uint8Array.from({ length: n }, (_, i) => i & 0xff)
        assertBytes(encode(value), referenceEncode(value))
      })

      it(`bytes of ${n} between small items`, () => {
        const value = ['head', Uint8Array.from({ length: n }, (_, i) => i & 0xff), 1, 'tail', bytesOf(n, 9), null]
        assertBytes(encode(value), referenceEncode(value))
      })

      it(`string of ${n}`, () => {
        const value = ['a', 'é'.repeat(n), 'b']
        assertBytes(encode(value), referenceEncode(value))
      })
    }

    it('interleaves large passthrough segments with small writes', () => {
      const value = []
      for (let i = 0; i < 40; i++) {
        value.push(i, 'k' + i, bytesOf(1000 + i * 3, i), bytesOf(i, i))
      }
      assertBytes(encode(value), referenceEncode(value))
    })

    it('encodes a long run of large byte arrays', () => {
      const value = []
      for (let i = 0; i < 2000; i++) {
        value.push(i, bytesOf(1500, i & 0xff), 'k' + i)
      }
      const out = encode(value)
      assert.isAbove(out.length, 3000000)
      assertBytes(out, referenceEncode(value))
    })

    it('accepts subarray views', () => {
      const backing = Uint8Array.from({ length: 4000 }, (_, i) => i & 0xff)
      const value = [backing.subarray(10, 2000), backing.subarray(5, 9), backing.subarray(3000)]
      assertBytes(encode(value), referenceEncode(value))
    })
  })

  describe('growth and segments', () => {
    it('crosses the single-buffer limit with small items', () => {
      const value = Array.from({ length: 200000 }, (_, i) => i % 70000)
      const out = encode(value)
      assert.isAbove(out.length, 262144)
      assertBytes(out, referenceEncode(value))
    })

    it('crosses the limit with many segments', () => {
      const value = Array.from({ length: 2000 }, (_, i) => ['s' + i, bytesOf(2000 + (i % 7), i & 0xff), i])
      const out = encode(value)
      assert.isAbove(out.length, 3 * 262144)
      assertBytes(out, referenceEncode(value))
    })

    it('single item larger than the limit', () => {
      for (const n of [262143, 262144, 262145, 1000000]) {
        const value = { a: 1, bb: 'z'.repeat(n), ccc: [1, 2, 3] }
        assertBytes(encode(value), referenceEncode(value))
      }
    })

    it('a small encode after a large one is correct', () => {
      const big = encode(['x'.repeat(5000000), bytesOf(300000)])
      assert.isAbove(big.length, 5000000)
      for (let i = 0; i < 5; i++) {
        assert.strictEqual(toHex(encode({ a: i })), 'a1' + '6161' + toHex(encode(i)))
      }
    })

    it('a small encode after a medium one is correct', () => {
      for (const n of [3000, 40000, 65536, 70000, 200000]) {
        encode(['y'.repeat(n)])
        assert.strictEqual(toHex(encode([1, 'ab'])), '82' + '01' + '626162')
      }
    })

    it('repeated encodes of varying size', () => {
      const values = [1, 'x'.repeat(10000), [1, 2, 3], bytesOf(100000), {}, 'x'.repeat(300000), 'hi', [[]]]
      for (let round = 0; round < 3; round++) {
        for (const v of values) {
          assertBytes(encode(v), referenceEncode(v))
        }
      }
    })
  })

  describe('re-entrancy', () => {
    it('nested encode from a getter while large segments are pending', () => {
      const value = [bytesOf(5000, 1), { get a () { return encode(bytesOf(3000, 2)) } }, 'tail']
      assertBytes(encode(value), referenceEncode([bytesOf(5000, 1), { a: encode(bytesOf(3000, 2)) }, 'tail']))
    })

    it('nested encode from a type encoder', () => {
      class Foo {}
      const typeEncoders = {
        Object: (/** @type {any} */ o) => o instanceof Foo ? new Token(Type.bytes, encode(bytesOf(2000, 3))) : null
      }
      const out = encode(['aaaa', new Foo(), bytesOf(1500, 4)], { typeEncoders })
      assertBytes(out, referenceEncode(['aaaa', encode(bytesOf(2000, 3)), bytesOf(1500, 4)]))
    })

    it('writer is usable after an encode throws', () => {
      assert.throws(() => encode([1, bytesOf(3000), { get a () { throw new Error('boom') } }]), /boom/)
      assert.strictEqual(toHex(encode([1, 2])), '820102')
    })
  })

  describe('other entry points', () => {
    it('encodeInto is unaffected', () => {
      for (const n of [0, 20, 1023, 1024, 5000]) {
        const value = ['a', bytesOf(n, 5), 3]
        const expected = referenceEncode(value)
        const dest = new Uint8Array(expected.length + 4).fill(0xee)
        const { written } = encodeInto(value, dest)
        assert.strictEqual(written, expected.length)
        assert.deepEqual(dest.subarray(0, written), expected)
        assert.deepEqual([...dest.subarray(written)], [0xee, 0xee, 0xee, 0xee])
      }
    })

    it('token path (addBreakTokens disables direct encode)', () => {
      for (const n of sizes) {
        const value = ['a', bytesOf(n), 'b'.repeat(n), { b: [n], aa: 1 }]
        const options = { addBreakTokens: true }
        assertBytes(encode(value, options), referenceEncode(value, options))
      }
    })

    it('custom string type encoder falls through to default encoding', () => {
      const typeEncoders = { string: () => null }
      for (const n of sizes) {
        const value = ['a', bytesOf(n), 'b'.repeat(n)]
        assertBytes(encode(value, { typeEncoders }), referenceEncode(value))
      }
    })
  })

  describe('randomized equivalence', () => {
    // small deterministic PRNG so failures reproduce
    function rng (/** @type {number} */ seed) {
      return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
      }
    }

    function gen (/** @type {() => number} */ rand, depth = 0) {
      const r = rand()
      if (depth > 3 || r < 0.35) {
        const k = Math.floor(rand() * 7)
        switch (k) {
          case 0: return Math.floor(rand() * 2 ** 32) - 2 ** 31
          case 1: return rand() * 1e6
          case 2: return 's'.repeat(Math.floor(rand() * 40)) + (rand() < 0.2 ? 'é中' : '')
          case 3: return bytesOf(Math.floor(rand() ** 3 * 3000), Math.floor(rand() * 256))
          case 4: return rand() < 0.5
          case 5: return null
          default: return BigInt(Math.floor(rand() * 1e12)) * 1000n
        }
      }
      const n = Math.floor(rand() * 12)
      if (r < 0.7) {
        return Array.from({ length: n }, () => gen(rand, depth + 1))
      }
      const o = /** @type {Record<string, any>} */ ({})
      // length-first key order, matching the default map sort
      for (let i = 0; i < n; i++) {
        o['k' + String(i).padStart(2, '0')] = gen(rand, depth + 1)
      }
      return o
    }

    it('matches the chunk-list reference writer', () => {
      const rand = rng(12345)
      for (let i = 0; i < 300; i++) {
        const value = gen(rand)
        assertBytes(encode(value), referenceEncode(value), `case ${i}`)
      }
    })
  })
})
