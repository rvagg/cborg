/* eslint-env mocha */

import * as chai from 'chai'
import { encode, decode } from '../lib/extended/extended.js'
import { encode as cborgEncode } from '../cborg.js'

const { assert } = chai

describe('cborg/extended', () => {
  describe('Date', () => {
    it('round-trips a date', () => {
      const d = new Date('2024-01-15T12:30:00.000Z')
      const result = decode(encode(d))
      assert.ok(result instanceof Date)
      assert.strictEqual(result.getTime(), d.getTime())
    })

    it('round-trips date with milliseconds', () => {
      const d = new Date('2024-01-15T12:30:00.123Z')
      const result = decode(encode(d))
      assert.strictEqual(result.getTime(), d.getTime())
    })

    it('round-trips epoch date', () => {
      const d = new Date(0)
      const result = decode(encode(d))
      assert.strictEqual(result.getTime(), 0)
    })

    it('round-trips negative epoch date', () => {
      const d = new Date(-86400000) // 1 day before epoch
      const result = decode(encode(d))
      assert.strictEqual(result.getTime(), d.getTime())
    })
  })

  describe('RegExp', () => {
    it('round-trips pattern without flags', () => {
      const re = /foo.*bar/
      const result = decode(encode(re))
      assert.ok(result instanceof RegExp)
      assert.strictEqual(result.source, re.source)
      assert.strictEqual(result.flags, re.flags)
    })

    it('round-trips pattern with flags', () => {
      const re = /foo.*bar/gim
      const result = decode(encode(re))
      assert.strictEqual(result.source, re.source)
      assert.strictEqual(result.flags, re.flags)
    })

    it('round-trips complex pattern', () => {
      const re = /^[a-z]+\d{2,4}$/i
      const result = decode(encode(re))
      assert.strictEqual(result.source, re.source)
      assert.strictEqual(result.flags, re.flags)
    })

    it('round-trips empty pattern', () => {
      const re = /(?:)/
      const result = decode(encode(re))
      assert.strictEqual(result.source, '(?:)')
    })
  })

  describe('Set', () => {
    it('round-trips empty set', () => {
      const s = new Set()
      const result = decode(encode(s))
      assert.ok(result instanceof Set)
      assert.strictEqual(result.size, 0)
    })

    it('round-trips set with primitives', () => {
      const s = new Set([1, 2, 3, 'a', 'b'])
      const result = decode(encode(s))
      assert.ok(result instanceof Set)
      assert.strictEqual(result.size, 5)
      assert.ok(result.has(1))
      assert.ok(result.has(2))
      assert.ok(result.has(3))
      assert.ok(result.has('a'))
      assert.ok(result.has('b'))
    })

    it('round-trips set with objects', () => {
      const s = new Set([{ x: 1 }, { y: 2 }])
      const result = decode(encode(s))
      assert.strictEqual(result.size, 2)
      const arr = [...result]
      // Objects inside the set stay as objects (useMaps: false)
      assert.ok(!(arr[0] instanceof Map))
      assert.ok(!(arr[1] instanceof Map))
      assert.strictEqual(arr[0].x, 1)
      assert.strictEqual(arr[1].y, 2)
    })
  })

  describe('Map', () => {
    it('round-trips empty map', () => {
      const m = new Map()
      const result = decode(encode(m))
      assert.ok(result instanceof Map)
      assert.strictEqual(result.size, 0)
    })

    it('round-trips map with string keys', () => {
      const m = new Map([['a', 1], ['b', 2]])
      const result = decode(encode(m))
      assert.ok(result instanceof Map)
      assert.strictEqual(result.get('a'), 1)
      assert.strictEqual(result.get('b'), 2)
    })

    it('round-trips map with number keys', () => {
      const m = new Map([[1, 'one'], [2, 'two']])
      const result = decode(encode(m))
      assert.ok(result instanceof Map)
      assert.strictEqual(result.get(1), 'one')
      assert.strictEqual(result.get(2), 'two')
    })

    it('round-trips map with mixed keys', () => {
      const m = new Map([['str', 1], [42, 2], [true, 3]])
      const result = decode(encode(m))
      assert.strictEqual(result.get('str'), 1)
      assert.strictEqual(result.get(42), 2)
      assert.strictEqual(result.get(true), 3)
    })

    it('round-trips map with object values', () => {
      const m = new Map([
        ['user1', { name: 'Alice', age: 30 }],
        ['user2', { name: 'Bob', age: 25 }]
      ])
      const result = decode(encode(m))
      assert.ok(result instanceof Map)
      // Values should be plain objects, not Maps
      assert.ok(!(result.get('user1') instanceof Map))
      assert.strictEqual(result.get('user1').name, 'Alice')
      assert.strictEqual(result.get('user2').age, 25)
    })

    it('round-trips map with nested map values', () => {
      const m = new Map([
        ['outer', new Map([['inner', 'value']])]
      ])
      const result = decode(encode(m))
      assert.ok(result instanceof Map)
      assert.ok(result.get('outer') instanceof Map)
      assert.strictEqual(result.get('outer').get('inner'), 'value')
    })

    it('round-trips map with BigInt keys', () => {
      const m = new Map([
        [123n, 'small bigint'],
        [BigInt('9007199254740993'), 'large bigint']
      ])
      const result = decode(encode(m))
      assert.ok(result instanceof Map)
      assert.strictEqual(result.get(123n), 'small bigint')
      assert.strictEqual(result.get(BigInt('9007199254740993')), 'large bigint')
    })

    it('round-trips map with Date keys', () => {
      const d1 = new Date('2024-01-01')
      const d2 = new Date('2024-12-31')
      const m = new Map([
        [d1, 'new year'],
        [d2, 'new year eve']
      ])
      const result = decode(encode(m))
      assert.ok(result instanceof Map)
      // Date keys become new Date instances, so we need to find by time
      const keys = [...result.keys()]
      assert.ok(keys[0] instanceof Date)
      assert.ok(keys[1] instanceof Date)
      assert.strictEqual(keys[0].getTime(), d1.getTime())
      assert.strictEqual(keys[1].getTime(), d2.getTime())
    })
  })

  describe('object containing Map', () => {
    it('round-trips object with Map property', () => {
      const obj = {
        name: 'test',
        data: new Map([[1, 'one'], [2, 'two']])
      }
      const result = decode(encode(obj))
      // Outer should be plain object
      assert.ok(!(result instanceof Map))
      assert.strictEqual(result.name, 'test')
      // Inner Map should be Map with integer keys preserved
      assert.ok(result.data instanceof Map)
      assert.strictEqual(result.data.get(1), 'one')
      assert.strictEqual(result.data.get(2), 'two')
    })

    it('round-trips deeply nested object/Map mix', () => {
      const obj = {
        level1: {
          level2: new Map([
            ['key', { level3: new Map([[42, 'deep']]) }]
          ])
        }
      }
      const result = decode(encode(obj))
      // Check structure preservation
      assert.ok(!(result instanceof Map))
      assert.ok(!(result.level1 instanceof Map))
      assert.ok(result.level1.level2 instanceof Map)
      assert.ok(!(result.level1.level2.get('key') instanceof Map))
      assert.ok(result.level1.level2.get('key').level3 instanceof Map)
      assert.strictEqual(result.level1.level2.get('key').level3.get(42), 'deep')
    })
  })

  describe('BigInt', () => {
    it('round-trips zero', () => {
      const result = decode(encode(0n))
      assert.strictEqual(typeof result, 'bigint')
      assert.strictEqual(result, 0n)
    })

    it('round-trips small positive', () => {
      const result = decode(encode(100n))
      assert.strictEqual(typeof result, 'bigint')
      assert.strictEqual(result, 100n)
    })

    it('round-trips small negative', () => {
      const result = decode(encode(-1n))
      assert.strictEqual(typeof result, 'bigint')
      assert.strictEqual(result, -1n)
    })

    it('round-trips beyond MAX_SAFE_INTEGER', () => {
      const n = 9007199254740993n
      const result = decode(encode(n))
      assert.strictEqual(result, n)
    })

    it('round-trips large positive', () => {
      const n = BigInt('123456789012345678901234567890')
      const result = decode(encode(n))
      assert.strictEqual(result, n)
    })

    it('round-trips large negative', () => {
      const n = BigInt('-123456789012345678901234567890')
      const result = decode(encode(n))
      assert.strictEqual(result, n)
    })
  })

  describe('TypedArrays', () => {
    it('Uint8Array', () => {
      const arr = new Uint8Array([1, 2, 3, 4, 5])
      const result = decode(encode(arr))
      assert.ok(result instanceof Uint8Array)
      assert.deepStrictEqual([...result], [1, 2, 3, 4, 5])
    })

    it('Uint8ClampedArray', () => {
      const arr = new Uint8ClampedArray([0, 128, 255])
      const result = decode(encode(arr))
      assert.ok(result instanceof Uint8ClampedArray)
      assert.deepStrictEqual([...result], [0, 128, 255])
    })

    it('Int8Array', () => {
      const arr = new Int8Array([-128, 0, 127])
      const result = decode(encode(arr))
      assert.ok(result instanceof Int8Array)
      assert.deepStrictEqual([...result], [-128, 0, 127])
    })

    it('Uint16Array', () => {
      const arr = new Uint16Array([0, 256, 65535])
      const result = decode(encode(arr))
      assert.ok(result instanceof Uint16Array)
      assert.deepStrictEqual([...result], [0, 256, 65535])
    })

    it('Int16Array', () => {
      const arr = new Int16Array([-32768, 0, 32767])
      const result = decode(encode(arr))
      assert.ok(result instanceof Int16Array)
      assert.deepStrictEqual([...result], [-32768, 0, 32767])
    })

    it('Uint32Array', () => {
      const arr = new Uint32Array([0, 65536, 4294967295])
      const result = decode(encode(arr))
      assert.ok(result instanceof Uint32Array)
      assert.deepStrictEqual([...result], [0, 65536, 4294967295])
    })

    it('Int32Array', () => {
      const arr = new Int32Array([-2147483648, 0, 2147483647])
      const result = decode(encode(arr))
      assert.ok(result instanceof Int32Array)
      assert.deepStrictEqual([...result], [-2147483648, 0, 2147483647])
    })

    it('Float32Array', () => {
      const arr = new Float32Array([1.5, -2.5, 3.14])
      const result = decode(encode(arr))
      assert.ok(result instanceof Float32Array)
      assert.strictEqual(result[0], 1.5)
      assert.strictEqual(result[1], -2.5)
      assert.ok(Math.abs(result[2] - 3.14) < 0.001)
    })

    it('Float64Array', () => {
      const arr = new Float64Array([1.1, -2.2, Math.PI, Infinity, -Infinity])
      const result = decode(encode(arr))
      assert.ok(result instanceof Float64Array)
      assert.deepStrictEqual([...result], [1.1, -2.2, Math.PI, Infinity, -Infinity])
    })

    it('BigUint64Array', () => {
      const arr = new BigUint64Array([0n, 1n, BigInt('18446744073709551615')])
      const result = decode(encode(arr))
      assert.ok(result instanceof BigUint64Array)
      assert.deepStrictEqual([...result], [0n, 1n, BigInt('18446744073709551615')])
    })

    it('BigInt64Array', () => {
      const arr = new BigInt64Array([BigInt('-9223372036854775808'), 0n, BigInt('9223372036854775807')])
      const result = decode(encode(arr))
      assert.ok(result instanceof BigInt64Array)
      assert.deepStrictEqual([...result], [BigInt('-9223372036854775808'), 0n, BigInt('9223372036854775807')])
    })

    it('TypedArray view of larger buffer', () => {
      const buffer = new ArrayBuffer(100)
      const view = new Uint8Array(buffer, 10, 5)
      view.set([1, 2, 3, 4, 5])
      const result = decode(encode(view))
      assert.strictEqual(result.length, 5)
      assert.deepStrictEqual([...result], [1, 2, 3, 4, 5])
    })
  })

  describe('nested structures', () => {
    it('object with multiple types', () => {
      const obj = {
        date: new Date('2024-01-15T12:00:00Z'),
        pattern: /test/gi,
        mapping: new Map([['key', 'value']]),
        collection: new Set([1, 2, 3]),
        binary: new Uint8Array([1, 2, 3]),
        bignum: 123n
      }
      const result = decode(encode(obj))

      // Plain objects stay as objects (useMaps: false by default)
      assert.ok(!(result instanceof Map))
      assert.ok(typeof result === 'object')

      assert.ok(result.date instanceof Date)
      assert.strictEqual(result.date.getTime(), obj.date.getTime())

      assert.ok(result.pattern instanceof RegExp)
      assert.strictEqual(result.pattern.source, 'test')
      assert.strictEqual(result.pattern.flags, 'gi')

      // Tagged Maps decode as Maps
      assert.ok(result.mapping instanceof Map)
      assert.strictEqual(result.mapping.get('key'), 'value')

      assert.ok(result.collection instanceof Set)
      assert.strictEqual(result.collection.size, 3)

      assert.ok(result.binary instanceof Uint8Array)
      assert.deepStrictEqual([...result.binary], [1, 2, 3])

      assert.strictEqual(typeof result.bignum, 'bigint')
      assert.strictEqual(result.bignum, 123n)
    })

    it('deeply nested maps and sets', () => {
      const obj = {
        outer: new Map([
          ['inner', new Set([
            new Map([['deep', 'value']])
          ])]
        ])
      }
      const result = decode(encode(obj))

      // Plain objects stay as objects, tagged Maps become Maps
      assert.ok(!(result instanceof Map))
      assert.ok(result.outer instanceof Map)
      const inner = result.outer.get('inner')
      assert.ok(inner instanceof Set)
      const deepMap = [...inner][0]
      assert.ok(deepMap instanceof Map)
      assert.strictEqual(deepMap.get('deep'), 'value')
    })

    it('array of dates', () => {
      const dates = [
        new Date('2024-01-01'),
        new Date('2024-06-15'),
        new Date('2024-12-31')
      ]
      const result = decode(encode(dates))

      assert.strictEqual(result.length, 3)
      assert.ok(result[0] instanceof Date)
      assert.ok(result[1] instanceof Date)
      assert.ok(result[2] instanceof Date)
      assert.strictEqual(result[0].getTime(), dates[0].getTime())
      assert.strictEqual(result[1].getTime(), dates[1].getTime())
      assert.strictEqual(result[2].getTime(), dates[2].getTime())
    })
  })

  describe('undefined and null', () => {
    it('preserves undefined in objects', () => {
      const obj = { a: undefined, b: null, c: 1 }
      const result = decode(encode(obj))
      // Plain objects stay as objects
      assert.ok(!(result instanceof Map))
      assert.strictEqual(result.a, undefined)
      assert.strictEqual(result.b, null)
      assert.strictEqual(result.c, 1)
    })

    it('preserves null values', () => {
      const result = decode(encode(null))
      assert.strictEqual(result, null)
    })

    it('preserves undefined values', () => {
      const result = decode(encode(undefined))
      assert.strictEqual(result, undefined)
    })
  })

  describe('compatibility', () => {
    it('plain objects decode as objects (useMaps: false is default)', () => {
      const obj = { a: 1, b: [2, 3], c: 'hello' }
      const result = decode(encode(obj))
      // Plain objects stay as objects
      assert.ok(!(result instanceof Map))
      assert.strictEqual(result.a, 1)
      assert.deepStrictEqual(result.b, [2, 3])
      assert.strictEqual(result.c, 'hello')
    })

    it('plain objects decode as Maps with useMaps: true', () => {
      const obj = { a: 1, b: [2, 3], c: 'hello' }
      const result = decode(encode(obj), { useMaps: true })
      assert.ok(result instanceof Map)
      assert.strictEqual(result.get('a'), 1)
    })

    it('plain arrays still work', () => {
      const arr = [1, 'two', { three: 3 }]
      const result = decode(encode(arr))
      assert.ok(Array.isArray(result))
      assert.strictEqual(result[0], 1)
      assert.strictEqual(result[1], 'two')
      // Nested objects stay as objects
      assert.ok(!(result[2] instanceof Map))
      assert.strictEqual(result[2].three, 3)
    })

    it('can decode standard cborg output', () => {
      const obj = { a: 1, b: 'hello' }
      const standardCbor = cborgEncode(obj)
      const result = decode(standardCbor)
      // Plain objects stay as objects
      assert.ok(!(result instanceof Map))
      assert.strictEqual(result.a, 1)
      assert.strictEqual(result.b, 'hello')
    })

    it('primitives round-trip correctly', () => {
      assert.strictEqual(decode(encode(true)), true)
      assert.strictEqual(decode(encode(false)), false)
      assert.strictEqual(decode(encode(42)), 42)
      assert.strictEqual(decode(encode(-42)), -42)
      assert.strictEqual(decode(encode(3.14)), 3.14)
      assert.strictEqual(decode(encode('hello')), 'hello')
      assert.strictEqual(decode(encode('')), '')
    })
  })

  describe('edge cases', () => {
    it('empty object', () => {
      const result = decode(encode({}))
      // Plain objects stay as objects
      assert.ok(!(result instanceof Map))
      assert.deepStrictEqual(result, {})
    })

    it('empty array', () => {
      const result = decode(encode([]))
      assert.deepStrictEqual(result, [])
    })

    it('object with numeric string keys', () => {
      const obj = { 1: 'one', 2: 'two' }
      const result = decode(encode(obj))
      // Plain objects stay as objects
      // Note: JS object keys are strings, so { 1: 'one' } has key '1' not 1
      assert.ok(!(result instanceof Map))
      assert.strictEqual(result['1'], 'one')
      assert.strictEqual(result['2'], 'two')
    })

    it('very long string', () => {
      const str = 'x'.repeat(10000)
      const result = decode(encode(str))
      assert.strictEqual(result, str)
    })

    it('special float values', () => {
      assert.strictEqual(decode(encode(Infinity)), Infinity)
      assert.strictEqual(decode(encode(-Infinity)), -Infinity)
      assert.ok(Number.isNaN(decode(encode(NaN))))
    })
  })

  describe('insertion order preservation', () => {
    it('preserves Map key insertion order', () => {
      // Keys intentionally not in alphabetical or length-first order
      const map = new Map([
        ['zebra', 1],
        ['a', 2],
        ['mango', 3],
        ['b', 4]
      ])
      const result = decode(encode(map))
      const keys = [...result.keys()]
      assert.deepStrictEqual(keys, ['zebra', 'a', 'mango', 'b'])
    })

    it('preserves Map key insertion order with mixed key types', () => {
      const map = new Map([
        [100, 'hundred'],
        ['first', 1],
        [1, 'one'],
        ['zzz', 'last']
      ])
      const result = decode(encode(map))
      const keys = [...result.keys()]
      assert.deepStrictEqual(keys, [100, 'first', 1, 'zzz'])
    })

    it('preserves object key insertion order', () => {
      // Keys intentionally not in alphabetical or length-first order
      const obj = {
        zebra: 1,
        a: 2,
        mango: 3,
        b: 4
      }
      const result = decode(encode(obj))
      const keys = Object.keys(result)
      assert.deepStrictEqual(keys, ['zebra', 'a', 'mango', 'b'])
    })

    it('preserves nested Map and object insertion order', () => {
      const data = {
        zz: 'first',
        aa: new Map([
          ['zzz', 1],
          ['aaa', 2]
        ]),
        mm: 'last'
      }
      const result = decode(encode(data))
      // Object key order preserved
      assert.deepStrictEqual(Object.keys(result), ['zz', 'aa', 'mm'])
      // Nested Map key order preserved
      assert.deepStrictEqual([...result.aa.keys()], ['zzz', 'aaa'])
    })
  })

  describe('Error types', () => {
    it('round-trips Error', () => {
      const err = new Error('test error')
      const result = decode(encode(err))
      assert.ok(result instanceof Error)
      assert.strictEqual(result.message, 'test error')
      assert.strictEqual(result.name, 'Error')
    })

    it('round-trips TypeError', () => {
      const err = new TypeError('type mismatch')
      const result = decode(encode(err))
      assert.ok(result instanceof TypeError)
      assert.strictEqual(result.message, 'type mismatch')
      assert.strictEqual(result.name, 'TypeError')
    })

    it('round-trips RangeError', () => {
      const err = new RangeError('out of range')
      const result = decode(encode(err))
      assert.ok(result instanceof RangeError)
      assert.strictEqual(result.message, 'out of range')
      assert.strictEqual(result.name, 'RangeError')
    })

    it('round-trips SyntaxError', () => {
      const err = new SyntaxError('bad syntax')
      const result = decode(encode(err))
      assert.ok(result instanceof SyntaxError)
      assert.strictEqual(result.message, 'bad syntax')
    })

    it('round-trips ReferenceError', () => {
      const err = new ReferenceError('not defined')
      const result = decode(encode(err))
      assert.ok(result instanceof ReferenceError)
      assert.strictEqual(result.message, 'not defined')
    })

    it('round-trips EvalError', () => {
      const err = new EvalError('eval failed')
      const result = decode(encode(err))
      assert.ok(result instanceof EvalError)
      assert.strictEqual(result.message, 'eval failed')
    })

    it('round-trips URIError', () => {
      const err = new URIError('bad URI')
      const result = decode(encode(err))
      assert.ok(result instanceof URIError)
      assert.strictEqual(result.message, 'bad URI')
    })

    it('round-trips Error with empty message', () => {
      const err = new Error()
      const result = decode(encode(err))
      assert.ok(result instanceof Error)
      assert.strictEqual(result.message, '')
    })

    it('round-trips Error in object', () => {
      const obj = { error: new TypeError('failed'), code: 500 }
      const result = decode(encode(obj))
      assert.ok(result.error instanceof TypeError)
      assert.strictEqual(result.error.message, 'failed')
      assert.strictEqual(result.code, 500)
    })
  })

  describe('negative zero', () => {
    it('round-trips -0', () => {
      const result = decode(encode(-0))
      assert.ok(Object.is(result, -0))
    })

    it('distinguishes -0 from 0', () => {
      const negZero = decode(encode(-0))
      const posZero = decode(encode(0))
      assert.ok(Object.is(negZero, -0))
      assert.ok(Object.is(posZero, 0))
      assert.ok(!Object.is(negZero, posZero))
    })

    it('round-trips -0 in object', () => {
      const obj = { neg: -0, pos: 0 }
      const result = decode(encode(obj))
      assert.ok(Object.is(result.neg, -0))
      assert.ok(Object.is(result.pos, 0))
    })

    it('round-trips -0 in array', () => {
      const arr = [-0, 0, -0]
      const result = decode(encode(arr))
      assert.ok(Object.is(result[0], -0))
      assert.ok(Object.is(result[1], 0))
      assert.ok(Object.is(result[2], -0))
    })
  })
})
