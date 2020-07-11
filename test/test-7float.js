/* eslint-env mocha */

import chai from 'chai'

import { decode, encode } from '../cborg.js'
import { hexToUint8Array } from './common.js'

const { assert } = chai

const fixtures = [
  { data: '8601f5f4f6f720', expected: [1, true, false, null, undefined, -1], type: 'array of float specials' }
]

describe('float', () => {
  describe('decode', () => {
    for (const fixture of fixtures) {
      const data = hexToUint8Array(fixture.data)
      it(`should decode ${fixture.type}=${fixture.expected}`, () => {
        assert.deepStrictEqual(decode(data), fixture.expected, `decode ${fixture.type}`)
        assert.deepStrictEqual(decode(data, { strict: true }), fixture.expected, `decode ${fixture.type}`)
      })
    }
  })

  describe('encode', () => {
    for (const fixture of fixtures) {
      it(`should encode ${fixture.type}=${fixture.expected}`, () => {
        assert.strictEqual(encode(fixture.expected).toString('hex'), fixture.data, `encode ${fixture.type}`)
      })
    }
  })

  // mostly unnecessary, but feels good
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
