/* eslint-env mocha */

import chai from 'chai'

import { decode, encode } from '../cborg.js'

const { assert } = chai

describe('bigint', () => {
  describe('decode/encode', () => {
    const data = {
      foo: BigInt(12)
    }

    const encoded = encode(data)
    const decoded = decode(encoded)

    assert.strictEqual(decoded.foo, data.foo)
  })
})
