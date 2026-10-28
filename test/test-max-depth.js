/* eslint-env mocha */

import { assert } from 'chai'
import { decode, decodeFirst, Tokenizer } from '../cborg.js'
import { decode as jsonDecode, decodeFirst as jsonDecodeFirst } from '../lib/json/decode.js'
import { bigIntDecoder } from '../lib/taglib.js'

const toBytes = (str) => new TextEncoder().encode(str)
const tags = { 1: (d) => d() }
const depthErr = /CBOR decode error.*maximum nesting depth exceeded/

/** n nested definite arrays around 0 */
const nestedArrays = (n) => Uint8Array.from([...new Array(n).fill(0x81), 0x00])
/** n nested single-entry maps {"a": ...} around 0 */
const nestedMaps = (n) => Uint8Array.from([...new Array(n).fill([0xa1, 0x61, 0x61]).flat(), 0x00])
/** n nested indefinite arrays */
const nestedIndef = (n) => Uint8Array.from([...new Array(n).fill(0x9f), ...new Array(n).fill(0xff)])
/** n nested tag 1 wrappers around 0 */
const nestedTags = (n) => Uint8Array.from([...new Array(n).fill(0xc1), 0x00])

describe('maxDepth', () => {
  it('arrays at limit and limit+1', () => {
    for (const max of [1, 2, 5, 10]) {
      assert.doesNotThrow(() => decode(nestedArrays(max), { maxDepth: max }))
      assert.throws(() => decode(nestedArrays(max + 1), { maxDepth: max }), depthErr)
    }
  })

  it('scalars are depth 0', () => {
    assert.strictEqual(decode(new Uint8Array([0x00]), { maxDepth: 0 }), 0)
    assert.throws(() => decode(nestedArrays(1), { maxDepth: 0 }), depthErr)
  })

  it('maps at limit and limit+1', () => {
    for (const max of [1, 3, 8]) {
      assert.doesNotThrow(() => decode(nestedMaps(max), { maxDepth: max }))
      assert.throws(() => decode(nestedMaps(max + 1), { maxDepth: max }), depthErr)
      assert.doesNotThrow(() => decode(nestedMaps(max), { maxDepth: max, useMaps: true }))
      assert.throws(() => decode(nestedMaps(max + 1), { maxDepth: max, useMaps: true }), depthErr)
    }
  })

  it('indefinite length containers', () => {
    for (const max of [1, 4]) {
      assert.doesNotThrow(() => decode(nestedIndef(max), { maxDepth: max }))
      assert.throws(() => decode(nestedIndef(max + 1), { maxDepth: max }), depthErr)
    }
  })

  it('tags count as a level', () => {
    for (const max of [1, 4]) {
      assert.deepStrictEqual(decode(nestedTags(max), { maxDepth: max, tags }), 0)
      assert.throws(() => decode(nestedTags(max + 1), { maxDepth: max, tags }), depthErr)
    }
    // a tag around an array is two levels
    const tagArr = Uint8Array.from([0xc1, 0x81, 0x00])
    assert.deepStrictEqual(decode(tagArr, { maxDepth: 2, tags }), [0])
    assert.throws(() => decode(tagArr, { maxDepth: 1, tags }), depthErr)
  })

  it('tag decode.entries() counts the tag and the map', () => {
    const entries = { 259: (d) => d.entries() }
    const bytes = Uint8Array.from([0xd9, 0x01, 0x03, 0xa1, 0x01, 0x02]) // 259({1: 2})
    assert.deepStrictEqual(decode(bytes, { maxDepth: 2, tags: entries }), [[1, 2]])
    assert.throws(() => decode(bytes, { maxDepth: 1, tags: entries }), depthErr)
    // a container nested in the map is a further level
    const deep = Uint8Array.from([0xd9, 0x01, 0x03, 0xa1, 0x01, 0x81, 0x02])
    assert.deepStrictEqual(decode(deep, { maxDepth: 3, tags: entries }), [[1, [2]]])
    assert.throws(() => decode(deep, { maxDepth: 2, tags: entries }), depthErr)
  })

  it('mixed arrays, maps, tags', () => {
    // [{"a": 1([0])}]: array, map, tag, array
    const bytes = Uint8Array.from([0x81, 0xa1, 0x61, 0x61, 0xc1, 0x81, 0x00])
    assert.deepStrictEqual(decode(bytes, { maxDepth: 4, tags }), [{ a: [0] }])
    assert.throws(() => decode(bytes, { maxDepth: 3, tags }), depthErr)
  })

  it('siblings do not accumulate', () => {
    const bytes = Uint8Array.from([0x83, 0x81, 0x00, 0x81, 0x00, 0x81, 0x00])
    assert.deepStrictEqual(decode(bytes, { maxDepth: 2 }), [[0], [0], [0]])
  })

  it('Infinity disables the limit', () => {
    assert.doesNotThrow(() => decode(nestedArrays(300), { maxDepth: Infinity }))
  })

  it('default is 256', () => {
    assert.doesNotThrow(() => decode(nestedArrays(256)))
    assert.throws(() => decode(nestedArrays(257)), depthErr)
    assert.doesNotThrow(() => decode(nestedMaps(256)))
    assert.throws(() => decode(nestedMaps(257)), depthErr)
    assert.doesNotThrow(() => decode(nestedTags(256), { tags }))
    assert.throws(() => decode(nestedTags(257), { tags }), depthErr)
  })

  it('can be raised', () => {
    assert.doesNotThrow(() => decode(nestedArrays(1000), { maxDepth: 1000 }))
  })

  it('very deep input throws a cborg error, not a stack overflow', () => {
    assert.throws(() => decode(nestedArrays(1000000)), depthErr)
    assert.throws(() => decode(nestedMaps(1000000)), depthErr)
  })

  it('decodeFirst', () => {
    const [v, rest] = decodeFirst(Uint8Array.from([...nestedArrays(2), 0x01]), { maxDepth: 2 })
    assert.deepStrictEqual(v, [[0]])
    assert.deepStrictEqual(rest, Uint8Array.from([1]))
    assert.throws(() => decodeFirst(nestedArrays(3), { maxDepth: 2 }), depthErr)
  })

  it('custom tokenizer', () => {
    const bytes = nestedArrays(3)
    const tokenizer = new Tokenizer(bytes, {})
    assert.throws(() => decode(bytes, { maxDepth: 2, tokenizer }), depthErr)
  })

  it('taglib decoders work', () => {
    assert.strictEqual(decode(Uint8Array.from([0xc2, 0x41, 0x01]), { tags: { 2: bigIntDecoder }, maxDepth: 1 }), 1n)
  })

  it('dag-cbor profile decodes normally', () => {
    const opts = {
      strict: true,
      rejectDuplicateMapKeys: true,
      allowIndefinite: false,
      allowNaN: false,
      allowInfinity: false,
      coerceUndefinedToNull: true,
      allowBigInt: true,
      tags: []
    }
    opts.tags[42] = (d) => d()
    assert.deepStrictEqual(decode(Uint8Array.from([0x82, 0xa1, 0x61, 0x61, 0x01, 0x80]), opts), [{ a: 1 }, []])
    assert.throws(() => decode(nestedArrays(257), opts), depthErr)
  })
})

describe('maxDepth json', () => {
  const arrs = (n) => toBytes('['.repeat(n) + '0' + ']'.repeat(n))
  const objs = (n) => toBytes('{"a":'.repeat(n) + '0' + '}'.repeat(n))

  it('arrays and objects at limit and limit+1', () => {
    for (const max of [1, 3, 7]) {
      assert.doesNotThrow(() => jsonDecode(arrs(max), { maxDepth: max }))
      assert.throws(() => jsonDecode(arrs(max + 1), { maxDepth: max }), depthErr)
      assert.doesNotThrow(() => jsonDecode(objs(max), { maxDepth: max }))
      assert.throws(() => jsonDecode(objs(max + 1), { maxDepth: max }), depthErr)
    }
  })

  it('mixed', () => {
    const bytes = toBytes('[{"a":[1]}]')
    assert.deepStrictEqual(jsonDecode(bytes, { maxDepth: 3 }), [{ a: [1] }])
    assert.throws(() => jsonDecode(bytes, { maxDepth: 2 }), depthErr)
  })

  it('decodeFirst', () => {
    const [v] = jsonDecodeFirst(toBytes('[[0]] 1'), { maxDepth: 2 })
    assert.deepStrictEqual(v, [[0]])
    assert.throws(() => jsonDecodeFirst(arrs(3), { maxDepth: 2 }), depthErr)
  })

  it('default is 256, Infinity disables', () => {
    assert.doesNotThrow(() => jsonDecode(arrs(256)))
    assert.throws(() => jsonDecode(arrs(257)), depthErr)
    assert.doesNotThrow(() => jsonDecode(arrs(300), { maxDepth: Infinity }))
    assert.throws(() => jsonDecode(arrs(1000000)), depthErr)
  })

  it('dag-json profile decodes normally', () => {
    const opts = { strict: true, rejectDuplicateMapKeys: true, allowIndefinite: false, allowNaN: false, allowInfinity: false, allowBigInt: true, coerceUndefinedToNull: true }
    assert.deepStrictEqual(jsonDecode(toBytes('{"a":[1,{"b":null}]}'), opts), { a: [1, { b: null }] })
  })
})
