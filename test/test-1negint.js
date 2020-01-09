/* eslint-env mocha */

const { decode, encode } = require('../cborg')
const assert = require('assert')
const { hexToUint8Array } = require('./common')

// some from https://github.com/PJK/libcbor

const fixtures = [
  { data: '20', expected: -1, type: 'negint8' },
  { data: '22', expected: -3, type: 'negint8' },
  { data: '3863', expected: -100, type: 'negint8' },
  { data: '38ff', expected: -256, type: 'negint8' },
  { data: '3900ff', expected: -256, type: 'negint16', strict: false },
  { data: '3901f4', expected: -501, type: 'negint16' },
  { data: '3a000000ff', expected: -256, type: 'negint32', strict: false },
  { data: '3aa5f702b3', expected: -2784428724, type: 'negint32' },
  { data: '3b00000000000000ff', expected: -256, type: 'negint32', strict: false },
  { data: '3b0016db6db6db6db7', expected: Number.MIN_SAFE_INTEGER / 1.4 - 1, type: 'negint64' },
  { data: '3b001ffffffffffffe', expected: Number.MIN_SAFE_INTEGER, type: 'negint64' },
  // kind of hard to assert on these (TODO: improve bignum handling)
  { data: '3b001fffffffffffff', expected: -9007199254740992 /* Number.MIN_SAFE_INTEGER - 1 */, type: 'negint64', unsafe: true },
  { data: '3b0020000000000000', expected: -9007199254740993 /* Number.MIN_SAFE_INTEGER - 2 */, type: 'negint64', unsafe: true },
  { data: '3ba5f702b3a5f702b3', expected: -11959030306112471732, type: 'negint64', unsafe: true }
]

describe('negint', () => {
  describe('decode', () => {
    for (const fixture of fixtures) {
      const data = hexToUint8Array(fixture.data)
      it(`should decode ${fixture.type}=${fixture.expected}`, () => {
        assert.strictEqual(decode(data), fixture.expected, `decode ${fixture.type}`)
        if (fixture.strict === false) {
          assert.throws(() => decode(data, { strict: true }), { name: 'Error', message: 'CBOR decode error: integer encoded in more bytes than necessary (strict decode)' })
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
          assert.throws(() => encode(fixture.expected), { name: 'Error', message: /^CBOR encode error: number too large to encode \(-\d+\)$/ })
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
      if (!fixture.unsafe) {
        it(`should roundtrip ${fixture.type}=${fixture.expected}`, () => {
          assert.strictEqual(decode(encode(fixture.expected)), fixture.expected, `roundtrip ${fixture.type}`)
        })
      }
    }
  })
})
