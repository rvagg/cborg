/* eslint-env mocha */

import chai from 'chai'

import { decode, encode } from '../cborg.js'
import { fromHex, toHex } from '../lib/common.js'

const { assert } = chai

const fixtures = [
  { data: '8601f5f4f6f720', expected: [1, true, false, null, undefined, -1], type: 'array of float specials' },
  { data: 'f93800', expected: 0.5, type: 'float16' },
  { data: 'f9b800', expected: -0.5, type: 'float16' },
  { data: 'fa33c00000', expected: 8.940696716308594e-08, type: 'float32' },
  { data: 'fab3c00000', expected: -8.940696716308594e-08, type: 'float32' },
  { data: 'fb3ff199999999999a', expected: 1.1, type: 'float64' },
  { data: 'fbbff199999999999a', expected: -1.1, type: 'float64' },
  { data: 'fb3ff1c71c71c71c72', expected: 1.11111111111111111111111111111, type: 'float64' }, // eslint-disable-line
  { data: 'fb0000000000000002', expected: 1e-323, type: 'float64' },
  { data: 'fb8000000000000002', expected: -1e-323, type: 'float64' },
  { data: 'fb3fefffffffffffff', expected: 0.9999999999999999, type: 'float64' },
  { data: 'fbbfefffffffffffff', expected: -0.9999999999999999, type: 'float64' },
  { data: 'f97c00', expected: Infinity, type: 'Infinity' },
  { data: 'f9fc00', expected: -Infinity, type: '-Infinity' },
  { data: 'f97e00', expected: NaN, type: 'NaN' }
  // TODO: { data: 'fb40f4241a31a5a515', expected: 82497.63712086187, type: 'float64' }
]

describe('float', () => {
  describe('decode', () => {
    for (const fixture of fixtures) {
      const data = fromHex(fixture.data)
      it(`should decode ${fixture.type}=${fixture.expected}`, () => {
        assert.deepStrictEqual(decode(data), fixture.expected, `decode ${fixture.type}`)
        assert.deepStrictEqual(decode(data, { strict: true }), fixture.expected, `decode ${fixture.type}`)
      })
    }
  })

  it('error', () => {
    // minor number 28, too high for uint
    assert.throws(() => decode(fromHex('f80000')), Error, 'simple values are not supported (24)')

    assert.throws(() => decode(fromHex('f900')), Error, 'not enough data for float16')
    assert.throws(() => decode(fromHex('fa0000')), Error, 'not enough data for float32')
    assert.throws(() => decode(fromHex('fb00000000')), Error, 'not enough data for float64')
  })

  describe('encode', () => {
    for (const fixture of fixtures) {
      it(`should encode ${fixture.type}=${fixture.expected}`, () => {
        assert.strictEqual(toHex(encode(fixture.expected)), fixture.data, `encode ${fixture.type}`)
      })
    }
  })

  describe('roundtrip', () => {
    for (const fixture of fixtures) {
      if (!fixture.unsafe && fixture.strict !== false) {
        it(`should roundtrip ${fixture.type}=${fixture.expected}`, () => {
          assert.deepStrictEqual(decode(encode(fixture.expected)), fixture.expected, `roundtrip ${fixture.type}`)
        })
      }
    }
  })
})
