/* eslint-env mocha,es2020 */

import chai from 'chai'
import { inspect } from 'util'

import { decode } from '../cborg.js'
import { hexToUint8Array } from './common.js'
// fixtures from https://github.com/cbor/test-vectors
import { fixtures } from './appendix_a.js'

const { assert } = chai

function toHex (byts) {
  return byts.reduce((hex, byte) => hex + byte.toString(16).padStart(2, '0'), '')
}

const tags = []

tags[0] = function (obj) {
  if (typeof obj !== 'string') {
    throw new Error('expected number for tag 1')
  }
  return `0("${new Date(obj).toISOString().replace(/\.000Z$/, 'Z')}")`
}

tags[1] = function (obj) {
  if (typeof obj !== 'number') {
    throw new Error('expected number for tag 1')
  }
  return `1(${obj})`
}

tags[23] = function (obj) {
// expected conversion to base16
  if (!(obj instanceof Uint8Array)) {
    throw new Error('expected byte array for tag 23')
  }
  return `23(h'${toHex(obj)}')`
}

tags[24] = function (obj) { // embedded cbor, oh my
  return tags[23](obj).replace(/^23/, '24')
}

tags[32] = function (obj) { // url
  if (typeof obj !== 'string') {
    throw new Error('expected string for tag 32')
  }
  ;(() => new URL(obj))() // will throw if not a url
  return `32("${obj}")`
}

describe('cbor/test-vectors', () => {
  let i = 0
  for (const fixture of fixtures) {
    const u8a = hexToUint8Array(fixture.hex)
    let expected = fixture.decoded !== undefined ? fixture.decoded : fixture.diagnostic

    if (typeof expected === 'string' && expected.startsWith('h\'')) {
      expected = expected.replace(/(^h)'|('$)/g, '')
      if (!expected) {
        expected = new Uint8Array(0)
      } else {
        expected = new Uint8Array(expected.match(/../g).map(b => parseInt(b, 16)))
      }
    }

    it(`test vector #${i} decode: ${inspect(expected)}`, () => {
      if (fixture.error) {
        assert.throws(() => decode(u8a), fixture.error)
      } else {
        let actual = decode(u8a, { tags })
        if (typeof actual === 'bigint') {
          actual = inspect(actual)
        }
        if (typeof expected === 'bigint') {
          expected = inspect(expected)
        }
        assert.deepEqual(actual, expected)
      }
    })
    i++
  }
})
