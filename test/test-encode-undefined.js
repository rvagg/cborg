/* eslint-env mocha */

import * as chai from 'chai'

import { encode, decode } from '../cborg.js'

const { assert } = chai

describe('ignoreUndefinedProperties option', () => {
  it('should include undefined properties when option is not set', () => {
    const obj = {
      a: 1,
      b: undefined,
      c: 3,
      d: undefined
    }

    const encoded = encode(obj)
    const decoded = decode(encoded)

    assert.deepStrictEqual(decoded, { a: 1, b: undefined, c: 3, d: undefined })
  })

  it('should ignore undefined plain object properties when option is set', () => {
    const obj = {
      a: 1,
      b: undefined,
      c: 3,
      d: undefined
    }

    const encoded = encode(obj, { ignoreUndefinedProperties: true })
    const decoded = decode(encoded)

    assert.deepStrictEqual(decoded, { a: 1, c: 3 })
  })

  it('should include undefined Map values when option is set', () => {
    const obj = new Map()
    obj.set('a', 1)
    obj.set('b', undefined)
    obj.set('c', 3)
    obj.set('d', undefined)

    const encoded = encode(obj, { ignoreUndefinedProperties: true })
    const decoded = decode(encoded)

    assert.deepStrictEqual(decoded, { a: 1, b: undefined, c: 3, d: undefined })
  })

  it('should return empty object when all properties are undefined', () => {
    const obj = {
      a: undefined,
      b: undefined,
      c: undefined
    }

    const encoded = encode(obj, { ignoreUndefinedProperties: true })
    const decoded = decode(encoded)

    assert.deepStrictEqual(decoded, {})
  })

  it('should handle nested objects with undefined properties', () => {
    const obj = {
      a: 1,
      b: undefined,
      c: {
        d: 2,
        e: undefined,
        f: {
          g: 3,
          h: undefined
        }
      }
    }

    const encoded = encode(obj, { ignoreUndefinedProperties: true })
    const decoded = decode(encoded)

    assert.deepStrictEqual(decoded, {
      a: 1,
      c: {
        d: 2,
        f: {
          g: 3
        }
      }
    })
  })

  it('should handle empty object', () => {
    const obj = {}

    const encoded = encode(obj, { ignoreUndefinedProperties: true })
    const decoded = decode(encoded)

    assert.deepStrictEqual(decoded, {})
  })

  it('should not affect undefined values in arrays', () => {
    const obj = {
      a: [1, undefined, 3],
      b: undefined
    }

    const encoded = encode(obj, { ignoreUndefinedProperties: true })
    const decoded = decode(encoded)

    assert.deepStrictEqual(decoded, { a: [1, undefined, 3] })
  })
})
