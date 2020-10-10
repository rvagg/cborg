/* eslint-env mocha,es2020 */

import chai from 'chai'
import { inspect } from 'util'

import { decode } from '../cborg.js'
import { toHex, fromHex } from '../lib/common.js'
// fixtures from https://github.com/cbor/test-vectors
import { fixtures } from './appendix_a.js'

const { assert } = chai

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
    const u8a = fromHex(fixture.hex)
    let expected = fixture.decoded !== undefined ? fixture.decoded : fixture.diagnostic

    if (typeof expected === 'string' && expected.startsWith('h\'')) {
      return fromHex(expected.replace(/(^h)'|('$)/g, ''))
    }

    it(`test vector #${i} decode: ${inspect(expected).replace(/\n\s*/g, '')}`, () => {
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
