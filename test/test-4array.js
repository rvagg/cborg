/* eslint-env mocha */

const { decode, encode } = require('../cborg')
const { assert } = require('chai')
const { hexToUint8Array } = require('./common')

// some from https://github.com/PJK/libcbor

const fixtures = [
  { data: '80', expected: [], type: 'array 1 compact uint' },
  { data: '8102', expected: [2], type: 'array 1 compact uint' },
  { data: '8118ff', expected: [255], type: 'array 1 uint8' },
  { data: '811901f4', expected: [500], type: 'array 1 uint16' },
  { data: '811a00010000', expected: [65536], type: 'array 1 uint32' },
  { data: '811b00000000000000ff', expected: [255], type: 'array 1 uint64', strict: false },
  { data: '811b0016db6db6db6db7', expected: [Number.MAX_SAFE_INTEGER / 1.4], type: 'array 1 uint64' },
  { data: '811b001fffffffffffff', expected: [Number.MAX_SAFE_INTEGER], type: 'array 1 uint64' },
  { data: '8403040506', expected: [3, 4, 5, 6], type: 'array 4 ints' },
  {
    data: '8c1b0016db6db6db6db71a000100001901f40200202238ff3aa5f702b33b0016db6db6db6db74261316fc48c6175657320c39f76c49b746521',
    expected: [Number.MAX_SAFE_INTEGER / 1.4, 65536, 500, 2, 0, -1, -3, -256, -2784428724, Number.MIN_SAFE_INTEGER / 1.4 - 1, Buffer.from('a1'), 'Čaues ßvěte!'],
    type: 'array mixed terminals'
  },
  {
    data: '8265617272617982626f66820582666e657374656482666172726179736121',
    expected: ['array', ['of', [5, ['nested', ['arrays', '!']]]]],
    type: 'array nested'
  }
]

describe('array', () => {
  describe('decode', () => {
    for (const fixture of fixtures) {
      const data = hexToUint8Array(fixture.data)
      it(`should decode ${fixture.type}=${fixture.label || fixture.expected}`, () => {
        assert.deepStrictEqual(decode(data), fixture.expected, `decode ${fixture.type}`)
        if (fixture.strict === false) {
          assert.throws(() => decode(data, { strict: true }), Error, 'CBOR decode error: integer encoded in more bytes than necessary (strict decode)')
        } else {
          assert.deepStrictEqual(decode(data, { strict: true }), fixture.expected, `decode ${fixture.type}`)
        }
      })
    }
  })

  describe('encode', () => {
    for (const fixture of fixtures) {
      it(`should encode ${fixture.type}=${fixture.label || fixture.expected}`, () => {
        if (fixture.unsafe) {
          assert.throws(encode.bind(null, fixture.expected), Error, /^CBOR encode error: number too large to encode \(\d+\)$/)
        } else if (fixture.strict === false) {
          assert.notDeepEqual(encode(fixture.expected).toString('hex'), fixture.data, `encode ${fixture.type} !strict`)
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
        it(`should roundtrip ${fixture.type}=${fixture.label || fixture.expected}`, () => {
          assert.deepStrictEqual(decode(encode(fixture.expected)), fixture.expected, `roundtrip ${fixture.type}`)
        })
      }
    }
  })
})
