/* eslint-env mocha */

const { decode, encode } = require('../cborg')
const { assert } = require('chai')
const { hexToUint8Array } = require('./common')

// some from https://github.com/PJK/libcbor

const fixtures = [
  { data: '00', expected: 0, type: 'uint8' },
  { data: '02', expected: 2, type: 'uint8' },
  { data: '18ff', expected: 255, type: 'uint8' },
  { data: '1901f4', expected: 500, type: 'uint16' },
  { data: '1900ff', expected: 255, type: 'uint16', strict: false },
  { data: '19ffff', expected: 65535, type: 'uint16' },
  { data: '1a000000ff', expected: 255, type: 'uint32', strict: false },
  { data: '1a00010000', expected: 65536, type: 'uint32' },
  { data: '1a000f4240', expected: 1000000, type: 'uint32' },
  { data: '1aa5f702b3', expected: 2784428723, type: 'uint32' },
  { data: '1b00000000000000ff', expected: 255, type: 'uint64', strict: false },
  { data: '1b0016db6db6db6db7', expected: Number.MAX_SAFE_INTEGER / 1.4, type: 'uint64' },
  { data: '1b001fffffffffffff', expected: Number.MAX_SAFE_INTEGER, type: 'uint64' },
  // kind of hard to assert on this (TODO: improve bignum handling)
  { data: '1ba5f702b3a5f702b3', expected: 11959030306112471731, type: 'uint64', unsafe: true }
]

describe('uint', () => {
  describe('decode', () => {
    for (const fixture of fixtures) {
      const data = hexToUint8Array(fixture.data)
      it(`should decode ${fixture.type}=${fixture.expected}`, () => {
        assert.strictEqual(decode(data), fixture.expected, `decode ${fixture.type}`)
        if (fixture.strict === false) {
          assert.throws(() => decode(data, { strict: true }), Error, 'CBOR decode error: integer encoded in more bytes than necessary (strict decode)')
        } else {
          assert.strictEqual(decode(data, { strict: true }), fixture.expected, `decode ${fixture.type}`)
        }
      })
    }
  })

  describe('encode', () => {
    for (const fixture of fixtures) {
      it(`should encode ${fixture.type}=${fixture.expected}`, () => {
        if (fixture.unsafe) {
          assert.throws(encode.bind(null, fixture.expected), Error, /^CBOR encode error: number too large to encode \(\d+\)$/)
        } else if (fixture.strict === false) {
          assert.notStrictEqual(encode(fixture.expected).toString('hex'), fixture.data, `encode ${fixture.type} !strict`)
        } else {
          assert.strictEqual(encode(fixture.expected).toString('hex'), fixture.data, `encode ${fixture.type}`)
        }
      })
    }
  })

  // mostly unnecessary, but feels good
  describe('roundtrip', () => {
    for (const fixture of fixtures) {
      if (!fixture.unsafe && fixture.strict !== false) {
        it(`should roundtrip ${fixture.type}=${fixture.expected}`, () => {
          assert.strictEqual(decode(encode(fixture.expected)), fixture.expected, `roundtrip ${fixture.type}`)
        })
      }
    }
  })
})
