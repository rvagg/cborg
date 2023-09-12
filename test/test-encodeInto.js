/* eslint-env mocha */

import * as chai from 'chai'

import { encode, encodeInto } from '../cborg.js'
import { toHex } from '../lib/byte-utils.js'

const { assert } = chai

describe('encodeInto', () => {
  describe('basic functionality', () => {
    it('should encode into provided buffer and return { written }', () => {
      const dest = new Uint8Array(100)
      const result = encodeInto({ a: 1, b: [2, 3] }, dest)

      // Result should be { written: number } matching TextEncoder.encodeInto pattern
      assert.isObject(result)
      assert.property(result, 'written')
      assert.isNumber(result.written)

      // Should match normal encode output
      const expected = encode({ a: 1, b: [2, 3] })
      assert.strictEqual(result.written, expected.length)
      assert.strictEqual(toHex(dest.subarray(0, result.written)), toHex(expected))
    })

    it('should return correct written count', () => {
      const dest = new Uint8Array(100)
      const { written } = encodeInto(42, dest)
      const expected = encode(42)

      assert.strictEqual(written, expected.length)
      assert.strictEqual(toHex(dest.subarray(0, written)), toHex(expected))
    })
  })

  describe('quickEncodeToken bypass bug', () => {
    // These tests verify that simple values that would normally be handled
    // by quickEncodeToken still write to the destination buffer

    it('should write small integers (0-23) to destination buffer', () => {
      const dest = new Uint8Array(10)
      dest.fill(0xff) // Fill with sentinel value

      const { written } = encodeInto(5, dest)

      // Verify the value was actually written to dest
      assert.strictEqual(written, 1)
      assert.strictEqual(dest[0], 0x05, 'value should be written to dest[0]')
    })

    it('should write integer 0 to destination buffer', () => {
      const dest = new Uint8Array(10)
      dest.fill(0xff)

      const { written } = encodeInto(0, dest)

      assert.strictEqual(written, 1)
      assert.strictEqual(dest[0], 0x00)
    })

    it('should write integer 23 to destination buffer', () => {
      const dest = new Uint8Array(10)
      dest.fill(0xff)

      const { written } = encodeInto(23, dest)

      assert.strictEqual(written, 1)
      assert.strictEqual(dest[0], 0x17)
    })

    it('should write true to destination buffer', () => {
      const dest = new Uint8Array(10)
      dest.fill(0xff)

      const { written } = encodeInto(true, dest)

      assert.strictEqual(written, 1)
      assert.strictEqual(dest[0], 0xf5) // CBOR true
    })

    it('should write false to destination buffer', () => {
      const dest = new Uint8Array(10)
      dest.fill(0xff)

      const { written } = encodeInto(false, dest)

      assert.strictEqual(written, 1)
      assert.strictEqual(dest[0], 0xf4) // CBOR false
    })

    it('should write null to destination buffer', () => {
      const dest = new Uint8Array(10)
      dest.fill(0xff)

      const { written } = encodeInto(null, dest)

      assert.strictEqual(written, 1)
      assert.strictEqual(dest[0], 0xf6) // CBOR null
    })

    it('should write empty string to destination buffer', () => {
      const dest = new Uint8Array(10)
      dest.fill(0xff)

      const { written } = encodeInto('', dest)

      assert.strictEqual(written, 1)
      assert.strictEqual(dest[0], 0x60) // CBOR empty string
    })

    it('should write empty array to destination buffer', () => {
      const dest = new Uint8Array(10)
      dest.fill(0xff)

      const { written } = encodeInto([], dest)

      assert.strictEqual(written, 1)
      assert.strictEqual(dest[0], 0x80) // CBOR empty array
    })

    it('should write empty object to destination buffer', () => {
      const dest = new Uint8Array(10)
      dest.fill(0xff)

      const { written } = encodeInto({}, dest)

      assert.strictEqual(written, 1)
      assert.strictEqual(dest[0], 0xa0) // CBOR empty map
    })

    it('should write negative integers (-1 to -24) to destination buffer', () => {
      const dest = new Uint8Array(10)
      dest.fill(0xff)

      const { written } = encodeInto(-1, dest)

      assert.strictEqual(written, 1)
      assert.strictEqual(dest[0], 0x20) // CBOR -1
    })
  })

  describe('buffer overflow', () => {
    it('should throw when destination buffer is too small', () => {
      const dest = new Uint8Array(1) // Too small for { a: 1 }

      assert.throws(
        () => encodeInto({ a: 1 }, dest),
        /write out of bounds|destination buffer is too small/
      )
    })

    it('should throw when destination buffer is empty', () => {
      const dest = new Uint8Array(0)

      assert.throws(
        () => encodeInto(1, dest),
        /write out of bounds|destination buffer is too small/
      )
    })

    it('should throw when destination is exactly one byte too small', () => {
      const data = { key: 'value' }
      const needed = encode(data).length
      const dest = new Uint8Array(needed - 1)

      assert.throws(
        () => encodeInto(data, dest),
        /write out of bounds|destination buffer is too small/
      )
    })

    it('should succeed when destination is exactly the right size', () => {
      const data = { key: 'value' }
      const needed = encode(data).length
      const dest = new Uint8Array(needed)

      const { written } = encodeInto(data, dest)
      assert.strictEqual(written, needed)
      assert.strictEqual(toHex(dest.subarray(0, written)), toHex(encode(data)))
    })
  })

  describe('data integrity', () => {
    it('should produce identical output to encode()', () => {
      const testCases = [
        0,
        1,
        23,
        24,
        255,
        256,
        65535,
        65536,
        -1,
        -24,
        -25,
        -256,
        true,
        false,
        null,
        '',
        'hello',
        'a'.repeat(100),
        [],
        [1, 2, 3],
        {},
        { a: 1 },
        { nested: { deeply: { value: [1, 2, 3] } } },
        new Uint8Array([1, 2, 3]),
        1.5,
        -1.5,
        Math.PI
      ]

      for (const data of testCases) {
        const expected = encode(data)
        const dest = new Uint8Array(expected.length + 10)
        const { written } = encodeInto(data, dest)

        assert.strictEqual(written, expected.length,
          `encodeInto should return correct written count for: ${JSON.stringify(data)}`)
        assert.strictEqual(toHex(dest.subarray(0, written)), toHex(expected),
          `encodeInto should match encode for: ${JSON.stringify(data)}`)
      }
    })
  })

  describe('buffer reuse pattern', () => {
    it('should support reusing the same buffer for multiple encodes', () => {
      const dest = new Uint8Array(100)

      // First encode
      const { written: written1 } = encodeInto({ a: 1 }, dest)
      const hex1 = toHex(dest.subarray(0, written1))

      // Second encode into same buffer (overwrites from start)
      const { written: written2 } = encodeInto({ b: 2 }, dest)
      const hex2 = toHex(dest.subarray(0, written2))

      // Both should be correct
      assert.strictEqual(hex1, toHex(encode({ a: 1 })))
      assert.strictEqual(hex2, toHex(encode({ b: 2 })))
    })
  })
})
