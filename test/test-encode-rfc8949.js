/* eslint-env mocha */

import * as chai from 'chai'
import { encode, rfc8949EncodeOptions } from '../cborg.js'
import { toHex } from '../lib/byte-utils.js'

const { assert } = chai

describe('RFC8949 deterministic encoding', () => {
  it('should encode', () => {
    const value = new Map()
    // https://datatracker.ietf.org/doc/html/rfc8949#section-4.2.1
    value.set(false, false)
    // value.set([-1], [-1])
    // value.set([100], [100])
    value.set('aa', 'aa')
    value.set('z', 'z')
    value.set(-1, -1)
    value.set(10, 10)
    value.set(100, 100)

    const data = encode(value, rfc8949EncodeOptions)
    assert.deepEqual(
      toHex(data),
      'a60a0a186418642020617a617a626161626161f4f4'
    )
    // {10: 10, 100: 100, -1: -1, "z": "z", "aa": "aa", false: false}
  })

  it('should encode floats in shortest form', () => {
    // https://datatracker.ietf.org/doc/html/rfc8949#section-4.2.1
    // "Floating-point values also MUST use the shortest form ... 1.5 is
    //  encoded as 0xf93e00"
    assert.deepEqual(toHex(encode(1.5, rfc8949EncodeOptions)), 'f93e00')
    assert.deepEqual(toHex(encode(Infinity, rfc8949EncodeOptions)), 'f97c00')
    assert.deepEqual(toHex(encode(NaN, rfc8949EncodeOptions)), 'f97e00')
    // values that genuinely need 64 bits stay 64 bits
    assert.deepEqual(toHex(encode(1.1, rfc8949EncodeOptions)), 'fb3ff199999999999a')
  })

  it('will throw on complex key types', () => {
    const value = new Map()
    // https://datatracker.ietf.org/doc/html/rfc8949#section-4.2.1
    value.set(false, false)
    value.set([-1], [-1])
    value.set([100], [100])
    value.set('aa', 'aa')
    value.set('z', 'z')
    value.set(-1, -1)
    value.set(10, 10)
    value.set(100, 100)

    assert.throws(() => {
      encode(value, rfc8949EncodeOptions)
    })
  })
})
