/* eslint-env mocha */

import * as chai from 'chai'

import { decode, Tokenizer } from '../cborg.js'
import { fromHex } from '../lib/byte-utils.js'
import { mapDecoder } from '../lib/taglib.js'
import { decode as extendedDecode } from '../lib/extended/extended.js'

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

  it('break as map value', () => {
    const msg = /^CBOR decode error.*unexpected break to map value/
    for (const hex of ['a16161ff', 'bf6161ffff']) {
      for (const useMaps of [false, true]) {
        assert.throws(() => decode(fromHex(hex), { useMaps }), msg, `${hex} useMaps=${useMaps}`)
      }
    }
    // via decode.entries()
    for (const hex of ['d90103a16161ff', 'd90103bf6161ffff']) {
      assert.throws(() => decode(fromHex(hex), { tags: { 259: mapDecoder } }), msg, hex)
    }
  })

  it('tag entries() with missing content', () => {
    assert.throws(() => decode(fromHex('d90103'), { tags: { 259: mapDecoder } }), /^CBOR decode error.*tag content missing/)
  })

  it('tokenizer next() past the end of data', () => {
    for (const data of [new Uint8Array(0), Uint8Array.from([0x01])]) {
      const tokenizer = new Tokenizer(data, {})
      if (data.length) {
        tokenizer.next()
      }
      assert.throws(() => tokenizer.next(), /^CBOR decode error.*not enough data/)
    }
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

  it('rejectDuplicateMapKeys applies to tagged map entries', () => {
    for (const [body, key, values] of [
      ['616101616102', 'a', [1, 2]],
      ['616102616101', 'a', [2, 1]],
      ['016161016162', 1, ['a', 'b']],
      ['016162016161', 1, ['b', 'a']]
    ]) {
      for (const [start, end] of [['a2', ''], ['bf', 'ff']]) {
        const data = fromHex(`d90103${start}${body}${end}`)
        for (const useMaps of [false, true]) {
          for (const tagDecoder of [mapDecoder, decode => decode.entries()]) {
            const options = { tags: { 259: tagDecoder }, useMaps }
            const permissive = tagDecoder === mapDecoder ? new Map([[key, values[1]]]) : values.map(value => [key, value])
            assert.deepStrictEqual(decode(data, options), permissive)
            assert.deepStrictEqual(decode(data, { ...options, rejectDuplicateMapKeys: false }), permissive)
            assert.throws(() => decode(data, { ...options, rejectDuplicateMapKeys: true }), /^CBOR decode error: found repeat map key/)
          }
          assert.throws(() => extendedDecode(data, { useMaps, rejectDuplicateMapKeys: true }), /^CBOR decode error: found repeat map key/)
        }
      }
    }
  })

  it('strict tagged maps reject duplicate keys before decoding their values', () => {
    let calls = 0
    const options = {
      rejectDuplicateMapKeys: true,
      tags: {
        100: decode => decode.entries(),
        101: decode => { calls++; return decode() }
      }
    }
    for (const hex of [
      'd864a26161016161d86502',
      'd864bf6161016161d86502ff',
      'd864a26161016161',
      'd864a2f97e0001f97e0002',
      'd864a20001f9800002'
    ]) {
      assert.throws(() => decode(fromHex(hex), options), /^CBOR decode error: found repeat map key/)
    }
    assert.strictEqual(calls, 0)
    const signedZero = decode(fromHex('d864a1f9800001'), options)
    assert.ok(Object.is(signedZero[0][0], -0))
    assert.deepStrictEqual(decode(fromHex('d864a280018002'), options), [[[], 1], [[], 2]])
  })

  it('strict tagged maps preserve distinct key types and map scope', () => {
    for (const useMaps of [false, true]) {
      const options = { tags: { 259: mapDecoder }, useMaps, rejectDuplicateMapKeys: true }
      for (const hex of ['d90103a201616161316162', 'd90103bf01616161316162ff']) {
        assert.deepStrictEqual(decode(fromHex(hex), options), new Map([[1, 'a'], ['1', 'b']]))
        assert.deepStrictEqual(extendedDecode(fromHex(hex), options), new Map([[1, 'a'], ['1', 'b']]))
      }
      const nested = useMaps ? new Map([['b', 1]]) : { b: 1 }
      assert.deepStrictEqual(decode(fromHex('d90103a16161a1616201'), options), new Map([['a', nested]]))
      assert.deepStrictEqual(decode(fromHex('d90103a0'), options), new Map())
      assert.deepStrictEqual(decode(fromHex('82d90103a1616101d90103a1616102'), options), [new Map([['a', 1]]), new Map([['a', 2]])])
    }
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
