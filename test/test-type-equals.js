/* eslint-env mocha */

import * as chai from 'chai'

import { Type } from '../lib/token.js'
import { Tokeniser } from '../lib/decode.js'
import { encode } from '../cborg.js'

const { assert } = chai

describe('Type.equals', () => {
  describe('same instance', () => {
    it('should return true for identical references', () => {
      assert.strictEqual(Type.equals(Type.map, Type.map), true)
      assert.strictEqual(Type.equals(Type.array, Type.array), true)
      assert.strictEqual(Type.equals(Type.uint, Type.uint), true)
    })
  })

  describe('duplicate instances (bundler simulation)', () => {
    // Simulate what happens when a bundler creates duplicate Type instances
    // These have the same properties but are different objects
    const duplicateTypes = {
      uint: { major: 0, name: 'uint', terminal: true },
      negint: { major: 1, name: 'negint', terminal: true },
      bytes: { major: 2, name: 'bytes', terminal: true },
      string: { major: 3, name: 'string', terminal: true },
      array: { major: 4, name: 'array', terminal: false },
      map: { major: 5, name: 'map', terminal: false },
      tag: { major: 6, name: 'tag', terminal: false },
      float: { major: 7, name: 'float', terminal: true },
      false: { major: 7, name: 'false', terminal: true },
      true: { major: 7, name: 'true', terminal: true },
      null: { major: 7, name: 'null', terminal: true },
      undefined: { major: 7, name: 'undefined', terminal: true },
      break: { major: 7, name: 'break', terminal: true }
    }

    it('should return true for duplicate instances with same major/name', () => {
      assert.strictEqual(Type.equals(duplicateTypes.map, Type.map), true)
      assert.strictEqual(Type.equals(Type.map, duplicateTypes.map), true)
      assert.strictEqual(Type.equals(duplicateTypes.array, Type.array), true)
      assert.strictEqual(Type.equals(duplicateTypes.uint, Type.uint), true)
      assert.strictEqual(Type.equals(duplicateTypes.string, Type.string), true)
    })

    it('should correctly distinguish major-7 types', () => {
      // All these share major 7, must be distinguished by name
      assert.strictEqual(Type.equals(duplicateTypes.float, Type.float), true)
      assert.strictEqual(Type.equals(duplicateTypes.false, Type.false), true)
      assert.strictEqual(Type.equals(duplicateTypes.true, Type.true), true)
      assert.strictEqual(Type.equals(duplicateTypes.null, Type.null), true)
      assert.strictEqual(Type.equals(duplicateTypes.undefined, Type.undefined), true)
      assert.strictEqual(Type.equals(duplicateTypes.break, Type.break), true)

      // Cross-checks: same major, different name
      assert.strictEqual(Type.equals(duplicateTypes.float, Type.null), false)
      assert.strictEqual(Type.equals(duplicateTypes.true, Type.false), false)
      assert.strictEqual(Type.equals(duplicateTypes.break, Type.undefined), false)
    })

    it('should return false for different types', () => {
      assert.strictEqual(Type.equals(duplicateTypes.map, Type.array), false)
      assert.strictEqual(Type.equals(duplicateTypes.uint, Type.negint), false)
      assert.strictEqual(Type.equals(duplicateTypes.string, Type.bytes), false)
    })
  })

  describe('decode with simulated duplicate types', () => {
    it('should handle tokens with duplicate Type instances', () => {
      // Create a token with a "duplicate" Type (simulating bundler scenario)
      const duplicateMapType = { major: 5, name: 'map', terminal: false }

      // Encode a simple object
      const encoded = encode({ foo: 'bar' })

      // Decode using standard tokeniser
      const tokeniser = new Tokeniser(encoded, {})
      const firstToken = tokeniser.next()

      // The token should have our real Type.map
      assert.strictEqual(Type.equals(firstToken.type, Type.map), true)
      // And should also match a "duplicate" type
      assert.strictEqual(Type.equals(firstToken.type, duplicateMapType), true)
    })
  })
})
