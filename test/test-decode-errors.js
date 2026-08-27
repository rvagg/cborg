/* eslint-env mocha */

import * as chai from 'chai'

import { decode } from '../cborg.js'
import { fromHex } from '../lib/byte-utils.js'

const { assert } = chai

describe('decode errors', () => {
  it('not Uint8Array', () => {
    for (const arg of [true, false, null, undefined, 'string', { obj: 'ect' }, {}, ['array'], [], [1, 2, 3], 0, 100, 1.1, -1, Symbol.for('nope')]) {
      assert.throws(() => decode(arg), /CBOR decode error.*must be a Uint8Array/)
    }
  })

  it('no data', () => {
    assert.throws(() => decode(new Uint8Array('')), /CBOR decode error.*content/)
  })

  it('break only', () => {
    assert.throws(() => decode(new Uint8Array([255])), /CBOR decode error.*break/)
  })

  it('not enough map entries (value)', () => {
    // last value missing
    assert.throws(() => decode(fromHex('a2616f016174')), /map.*not enough entries.*value/)
  })

  it('not enough map entries (key)', () => {
    // last key & value missing
    assert.throws(() => decode(fromHex('a2616f01')), /map.*not enough entries.*key/)
  })

  it('break in lengthed map', () => {
    // 0xff (break) in the middle
    assert.throws(() => decode(fromHex('a2616f01ff740f')), /unexpected break to lengthed map/)
  })

  it('not enough array entries', () => {
    // last value missing
    assert.throws(() => decode(fromHex('82616f')), /array.*not enough entries/)
  })

  it('break in lengthed array', () => {
    // last value missing
    assert.throws(() => decode(fromHex('82ff')), /unexpected break to lengthed array/)
  })

  it('no such decoder', () => {
    // last value missing
    assert.throws(() => decode(fromHex('82ff')), /unexpected break to lengthed array/)
  })

  it('too many terminals', () => {
    // two '1's
    assert.throws(() => decode(fromHex('0101')), /too many terminals/)
  })

  it('rejectDuplicateMapKeys enabled on duplicate keys', () => {
    assert.deepStrictEqual(decode(fromHex('a3636261720363666f6f0163666f6f02')), { foo: 2, bar: 3 })
    assert.throws(() => decode(fromHex('a3636261720363666f6f0163666f6f02'), { rejectDuplicateMapKeys: true }), /CBOR decode error: found repeat map key "foo"/)
    assert.throws(() => decode(fromHex('a3636261720363666f6f0163666f6f02'), { useMaps: true, rejectDuplicateMapKeys: true }), /CBOR decode error: found repeat map key "foo"/)
  })

  it('__proto__ map key decodes as an own property without polluting the prototype', () => {
    // {"__proto__": {"naughty": "obj"}}
    const obj = decode(fromHex('a1695f5f70726f746f5f5fa1676e617567687479636f626a'))
    assert.ok(Object.hasOwn(obj, '__proto__'), 'has own __proto__ property')
    assert.deepStrictEqual(obj.__proto__, { naughty: 'obj' }) // eslint-disable-line no-proto
    assert.strictEqual(Object.getPrototypeOf(obj), Object.prototype, 'prototype is unchanged')
    assert.deepStrictEqual(Object.keys(obj), ['__proto__'])
  })

  it('rejectDuplicateMapKeys enabled on duplicate __proto__ keys', () => {
    // {"__proto__": 1, "__proto__": 2}
    assert.throws(() => decode(fromHex('a2695f5f70726f746f5f5f01695f5f70726f746f5f5f02'), { rejectDuplicateMapKeys: true }), /CBOR decode error: found repeat map key "__proto__"/)
  })
})
