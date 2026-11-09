/* eslint-env mocha */

import * as chai from 'chai'
import { diagnose } from '../lib/diagnose.js'
import { tagName } from '../lib/diagnostic-tags.js'
import { fromHex } from '../lib/byte-utils.js'

const { assert } = chai

/**
 * Node fields that locate an item, without children or annotations.
 * @param {import('../lib/diagnose.js').DiagnosticNode} node
 */
const at = ({ type, start, headerEnd, end, depth }) => ({ type, start, headerEnd, end, depth })

describe('diagnose', () => {
  it('locates each item and its header', () => {
    // {"a": 1, "b": [2, 3]}
    const { items, error } = diagnose(fromHex('a26161016162820203'))
    assert.isUndefined(error)
    assert.strictEqual(items.length, 1)
    const [map] = items
    assert.deepStrictEqual(at(map), { type: 'map', start: 0, headerEnd: 1, end: 9, depth: 0 })
    assert.strictEqual(map.value, 2)
    assert.deepStrictEqual(map.children?.map(at), [
      { type: 'string', start: 1, headerEnd: 2, end: 3, depth: 1 },
      { type: 'uint', start: 3, headerEnd: 4, end: 4, depth: 1 },
      { type: 'string', start: 4, headerEnd: 5, end: 6, depth: 1 },
      { type: 'array', start: 6, headerEnd: 7, end: 9, depth: 1 }
    ])
    assert.deepStrictEqual(map.children?.[3].children?.map((n) => [n.start, n.depth, n.value]), [[7, 2, 2], [8, 2, 3]])
  })

  it('separates argument bytes from string content', () => {
    // 24 byte string, a one byte length argument
    const { items: [node] } = diagnose(fromHex('5818' + '00'.repeat(24)))
    assert.deepStrictEqual(at(node), { type: 'bytes', start: 0, headerEnd: 2, end: 26, depth: 0 })
  })

  it('reads a sequence of items', () => {
    const { items, error } = diagnose(fromHex('0102'))
    assert.isUndefined(error)
    assert.deepStrictEqual(items.map((n) => n.value), [1, 2])
  })

  it('keeps a break as the last child, at its opener\'s depth', () => {
    const { items: [array] } = diagnose(fromHex('9f01ff'))
    assert.strictEqual(array.value, Infinity)
    assert.strictEqual(array.end, 3)
    assert.deepStrictEqual(array.children?.map(at), [
      { type: 'uint', start: 1, headerEnd: 2, end: 2, depth: 1 },
      { type: 'break', start: 2, headerEnd: 3, end: 3, depth: 0 }
    ])
  })

  it('returns the items read before an error', () => {
    const { items, error } = diagnose(fromHex('8201'))
    assert.strictEqual(items[0].children?.length, 1)
    assert.strictEqual(error?.offset, 2)
    assert.match(error?.cause.message || '', /not enough data/)
  })

  it('reports where a stray break is', () => {
    const { items, error } = diagnose(fromHex('01ff'))
    assert.strictEqual(items.length, 1)
    assert.strictEqual(error?.offset, 1)
    assert.match(error?.cause.message || '', /unexpected break/)
  })

  it('flags text strings that are not valid UTF-8', () => {
    assert.isTrue(diagnose(fromHex('62fffe')).items[0].invalidUtf8)
    assert.isFalse(diagnose(fromHex('626869')).items[0].invalidUtf8)
  })

  it('names tags', () => {
    assert.strictEqual(diagnose(fromHex('d82a01')).items[0].tagName, tagName(42))
    assert.isUndefined(diagnose(fromHex('d9fffe01')).items[0].tagName)
  })

  it('splits a CID into parts at their offsets in the input', () => {
    // {"link": CID(bafyreih77367z6727h4pp5xv6tz7f4pq57xo33hl5lu6rz7g4xsohyxb4a)}
    const hex = 'a1646c696e6bd82a58250001711220fffefdfcfbfaf9f8f7f6f5f4f3f2f1f0efeeedecebeae9e8e7e6e5e4e3e2e1e0'
    const tag = diagnose(fromHex(hex)).items[0].children?.[1]
    const content = tag?.children?.[0]
    assert.deepStrictEqual(content && at(content), { type: 'bytes', start: 8, headerEnd: 10, end: 47, depth: 2 })
    assert.deepStrictEqual(content?.annotation?.parts?.map(({ start, end }) => [start, end]), [
      [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 47]
    ])
    assert.strictEqual(content?.annotation?.summary, 'CIDv1(bafyreih77367z6727h4pp5xv6tz7f4pq57xo33hl5lu6rz7g4xsohyxb4a)')
  })

  it('notes content a tag cannot interpret', () => {
    const content = diagnose(fromHex('d82a01')).items[0].children?.[0]
    assert.strictEqual(content?.annotation?.note, 'invalid CID: content is not a byte string')
  })

  it('decodes embedded CBOR at its offsets in the input', () => {
    const content = diagnose(fromHex('d81843820102')).items[0].children?.[0]
    const embedded = content?.annotation?.embedded
    assert.isUndefined(embedded?.error)
    const [array] = embedded?.items || []
    assert.deepStrictEqual(at(array), { type: 'array', start: 3, headerEnd: 4, end: 6, depth: 0 })
    assert.deepStrictEqual(array.children?.map((n) => n.start), [4, 5])
  })

  it('notes embedded CBOR that does not decode', () => {
    const content = diagnose(fromHex('d818420102')).items[0].children?.[0]
    assert.isUndefined(content?.annotation?.embedded)
    assert.strictEqual(content?.annotation?.note, 'invalid embedded CBOR: more than one data item')
  })

  it('summarises dates and bignums', () => {
    assert.strictEqual(diagnose(fromHex('c100')).items[0].children?.[0].annotation?.summary, 'date(1970-01-01T00:00:00.000Z)')
    assert.strictEqual(diagnose(fromHex('c2420100')).items[0].children?.[0].annotation?.summary, 'bignum(256)')
  })

  it('builds deep nesting without recursion', () => {
    const depth = 20000
    let node = diagnose(fromHex('81'.repeat(depth) + '00')).items[0]
    while (node.children) {
      node = node.children[0]
    }
    assert.strictEqual(node.depth, depth)
  })
})
