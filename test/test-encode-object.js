/* eslint-env mocha */

import * as chai from 'chai'
import { encode, encodeInto, rfc8949EncodeOptions, Token, Type } from '../cborg.js'
import { toHex } from '../lib/byte-utils.js'

const { assert } = chai

// A custom string encoder forces the general map path while declining to
// change any output
let stringCalls = 0
const generalPath = {
  typeEncoders: {
    string: () => {
      stringCalls++
      return null
    }
  }
}

/**
 * Encode via the default path, the general path and encodeInto and require
 * identical bytes. Returns the default bytes as hex.
 * @param {any} value
 * @param {object} [opts]
 */
function same (value, opts = {}) {
  const fast = toHex(encode(value, opts))
  const general = toHex(encode(value, { ...opts, ...generalPath, typeEncoders: { ...opts.typeEncoders, ...generalPath.typeEncoders } }))
  assert.strictEqual(fast, general)
  const into = new Uint8Array(fast.length)
  const { written } = encodeInto(value, into, opts)
  assert.strictEqual(toHex(into.subarray(0, written)), fast)
  return fast
}

/**
 * @param {() => any} fn
 * @returns {Error}
 */
function thrown (fn) {
  try {
    fn()
  } catch (e) {
    return e
  }
  throw new Error('expected a throw')
}

/**
 * Same error from the default path and the general path.
 * @param {any} value
 * @param {object} [opts]
 */
function sameError (value, opts = {}) {
  const a = thrown(() => encode(value, opts))
  const b = thrown(() => encode(value, { ...opts, typeEncoders: { ...opts.typeEncoders, ...generalPath.typeEncoders } }))
  assert.strictEqual(a.constructor, b.constructor)
  assert.strictEqual(a.message, b.message)
  return a
}

/**
 * Both insertion orders of the entries.
 * @param {[string, any][]} entries
 * @param {object} [opts]
 */
function bothOrders (entries, opts) {
  const fwd = same(Object.fromEntries(entries), opts)
  const rev = same(Object.fromEntries([...entries].reverse()), opts)
  assert.strictEqual(fwd, rev)
  return fwd
}

/**
 * @param {number} seed
 */
function prng (seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('encode plain objects with ASCII keys', () => {
  it('general path override is real', () => {
    stringCalls = 0
    encode({ a: 1 }, generalPath)
    assert.isAbove(stringCalls, 0)
  })

  it('empty object', () => {
    assert.strictEqual(same({}), 'a0')
    assert.strictEqual(same({ a: undefined }, { ignoreUndefinedProperties: true }), 'a0')
  })

  it('length-first ordering and numeric-like keys', () => {
    const hex = bothOrders([['10', 1], ['9', 2], ['aa', 3], ['b', 4], ['', 5], ['B', 6], ['a', 7]])
    // length first, then bytewise: '', then '9' 'B' 'a' 'b', then '10' 'aa'
    assert.strictEqual(hex, 'a7' + '6005' + '6139' + '02' + '6142' + '06' + '6161' + '07' + '6162' + '04' + '623130' + '01' + '626161' + '03')
  })

  for (const n of [1, 15, 16, 17, 24, 25, 100, 300]) {
    it(`${n} keys in both orders`, () => {
      const entries = []
      for (let i = 0; i < n; i++) {
        entries.push([`k${(i * 7919) % 1000}x${i % 3 ? 'ab'.repeat(i % 5) : ''}`, i])
      }
      bothOrders(entries)
    })
  }

  it('key length bounds', () => {
    for (const len of [255, 256, 257]) {
      const entries = [['z'.repeat(len), 1], ['a', 2], ['y'.repeat(len), 3]]
      bothOrders(entries)
    }
  })

  it('non-ASCII boundaries', () => {
    for (const k of ['\x7f', '\x80', '\u00e9', '\u2603', '\ud83d\ude00']) {
      bothOrders([[k, 1], ['a', 2], ['bb', 3]])
    }
    assert.strictEqual(same({ '\x7f': 1 }), 'a1' + '617f' + '01')
    assert.strictEqual(same({ '\x80': 1 }), 'a1' + '62c280' + '01')
  })

  it('__proto__ as an own key', () => {
    const parsed = JSON.parse('{"__proto__": {"x": 1}, "a": 2}')
    same(parsed)
    const defined = {}
    Object.defineProperty(defined, '__proto__', { value: 5, enumerable: true, configurable: true, writable: true })
    defined.b = 1
    assert.strictEqual(same(defined), 'a2' + '6162' + '01' + '695f5f70726f746f5f5f' + '05')
  })

  it('null prototype and class instances', () => {
    const np = Object.create(null)
    np.b = 1
    np.a = 2
    same(np)
    class Foo {
      constructor () {
        this.y = 1
        this.x = [{ q: 1, p: 2 }]
      }
    }
    same(new Foo())
  })

  it('nested objects and arrays of objects', () => {
    same({ z: [{ b: 1, a: [{ d: {}, c: [] }] }, { a: 1 }], y: { x: { w: { v: 1 } } } })
  })

  it('symbol and non-enumerable keys are skipped', () => {
    const o = { a: 1 }
    o[Symbol('s')] = 2
    Object.defineProperty(o, 'hidden', { value: 3, enumerable: false })
    assert.strictEqual(same(o), 'a1' + '6161' + '01')
  })

  it('mixed values', () => {
    same({ n: null, t: true, f: false, i: -5, big: 2n ** 60n, fl: 1.5, s: 'str', b: new Uint8Array(2000), u8: new Uint8Array([1, 2]), d: new Date(0).getTime() })
  })

  it('randomised structures match the general path', function () {
    this.timeout(10000)
    const rnd = prng(0xc0ffee)
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ0123456789_-'
    const key = () => {
      const len = rnd() < 0.8 ? Math.floor(rnd() * 6) : Math.floor(rnd() * 40)
      let k = ''
      for (let i = 0; i < len; i++) k += chars[Math.floor(rnd() * chars.length)]
      return k
    }
    const value = (depth) => {
      const r = rnd()
      if (depth > 3 || r < 0.35) {
        const p = Math.floor(rnd() * 6)
        return [null, true, 'text' + key(), Math.floor((rnd() - 0.5) * 1e6), rnd(), new Uint8Array(Math.floor(rnd() * 5))][p]
      }
      if (r < 0.55) {
        return Array.from({ length: Math.floor(rnd() * 5) }, () => value(depth + 1))
      }
      const n = rnd() < 0.2 ? 17 + Math.floor(rnd() * 40) : Math.floor(rnd() * 12)
      const o = {}
      for (let i = 0; i < n; i++) o[key()] = value(depth + 1)
      return o
    }
    for (let i = 0; i < 300; i++) {
      same(value(0))
    }
  })
})

describe('encode plain objects bail and equivalence', () => {
  /**
   * @param {Record<string, any>} keysAndValues
   * @param {string} getterKey
   */
  function withCountingGetter (keysAndValues, getterKey) {
    const o = { ...keysAndValues }
    const count = { n: 0 }
    Object.defineProperty(o, getterKey, {
      enumerable: true,
      get () {
        count.n++
        return 7
      }
    })
    return { o, count }
  }

  it('getter runs once on both qualifying and bailing objects', () => {
    for (const k of ['g', 'caf\u00e9', 'x'.repeat(257)]) {
      const { o, count } = withCountingGetter({ a: 1, bb: 2 }, k)
      encode(o)
      assert.strictEqual(count.n, 1, `key length ${k.length}`)
      encode({ outer: o, list: [o] })
      assert.strictEqual(count.n, 3)
    }
  })

  it('bailing objects encode identically', () => {
    same(Object.fromEntries([['caf\u00e9', 1], ['a', 2], ['zz', 3]]))
    same({ ['x'.repeat(257)]: 1, a: 2 })
    same({ nested: Object.fromEntries([['\u00e9', 1], ['a', { b: 1 }]]), ok: 1 })
  })

  it('a throwing getter gives the same error and leaves the writer usable', () => {
    const boom = new Error('boom')
    const make = () => ({
      a: 1,
      get b () { throw boom },
      c: 2
    })
    assert.strictEqual(thrown(() => encode(make())), boom)
    assert.strictEqual(thrown(() => encode({ nested: [make()] })), boom)
    assert.strictEqual(toHex(encode({ a: 1 })), 'a16161' + '01')
    same({ b: [1, 2, 3], a: 'x' })
  })

  it('errors surface for the same value in the same order', () => {
    const order = []
    const mk = (name, throws) => ({
      get [name] () {
        order.push(name)
        if (throws) throw new Error(name)
        return 1
      }
    })
    const o = Object.defineProperties({}, {
      ...Object.getOwnPropertyDescriptors(mk('c', false)),
      ...Object.getOwnPropertyDescriptors(mk('a', true)),
      ...Object.getOwnPropertyDescriptors(mk('b', false))
    })
    for (const k of Object.keys(o)) Object.defineProperty(o, k, { enumerable: true })
    const e1 = thrown(() => encode(o))
    const o1 = order.splice(0)
    const e2 = thrown(() => encode(o, generalPath))
    const o2 = order.splice(0)
    assert.strictEqual(e1.message, e2.message)
    assert.deepEqual(o1, o2)
  })

  it('first unsupported value in sorted order triggers the error', () => {
    // sorted: a, bb, ccc. The Set (unsupported) under ccc and the function under a
    const v = { ccc: new Set(), a: () => {}, bb: 1 }
    const err = sameError(v)
    assert.include(err.message, 'unsupported type: Function')
    sameError({ b: Symbol('x') })
  })

  it('cycles', () => {
    const o = { a: 1 }
    o.self = o
    const err = sameError(o)
    assert.include(err.message, 'circular')
    const arr = [{ b: 1 }]
    arr[0].arr = arr
    sameError(arr)
    const shared = { s: 1 }
    same({ x: shared, y: shared, z: [shared] })
  })

  it('undefined with and without ignoreUndefinedProperties', () => {
    const v = { a: 1, b: undefined, c: { d: undefined, e: 2 } }
    same(v)
    same(v, { ignoreUndefinedProperties: true })
    const many = {}
    for (let i = 0; i < 30; i++) many[`k${i}`] = i % 3 ? undefined : i
    same(many)
    same(many, { ignoreUndefinedProperties: true })
    same({ a: undefined }, { ignoreUndefinedProperties: true })
  })

  it('undefined rejected by a type encoder: same error', () => {
    const typeEncoders = {
      undefined () { throw new Error('undefined is not supported') }
    }
    sameError({ a: 1, b: undefined }, { typeEncoders })
    same({ a: 1, b: undefined }, { typeEncoders, ignoreUndefinedProperties: true })
  })

  it('dag-cbor like options', () => {
    class CID {
      constructor (b) { this.bytes = b }
    }
    const typeEncoders = {
      Object (obj) {
        if (obj instanceof CID) {
          return [new Token(Type.tag, 42), new Token(Type.bytes, new Uint8Array([0, ...obj.bytes]))]
        }
        return null
      },
      Map () { throw new Error('Map is not supported') },
      undefined () { throw new Error('undefined is not supported') },
      number (n) {
        if (Number.isNaN(n) || n === Infinity || n === -Infinity) throw new Error('non-finite is not supported')
        return null
      }
    }
    const opts = { float64: true, typeEncoders }
    const cid = new CID([1, 2, 3])
    same({ link: cid, name: 'x', list: [{ '/': cid }], n: { deep: { link: cid } } }, opts)
    for (const bad of [{ a: 1, m: new Map() }, { a: undefined }, { a: 1, f: NaN }, { z: Infinity, a: -Infinity }, { q: [{ r: NaN }] }]) {
      sameError(bad, opts)
    }
  })

  it('custom Object type encoder at object level', () => {
    const typeEncoders = { Object: (o) => o.special ? new Token(Type.uint, 9) : null }
    same({ a: { special: true }, b: { c: 1 } }, { typeEncoders })
  })

  it('custom string type encoder is honoured for keys', () => {
    const typeEncoders = { string: (s) => new Token(Type.string, s.toUpperCase()) }
    assert.strictEqual(toHex(encode({ a: 'b' }, { typeEncoders })), 'a1' + '6141' + '6142')
  })

  it('a custom mapSorter never takes the ASCII path', () => {
    let calls = 0
    const mapSorter = (a, b) => {
      calls++
      return rfc8949EncodeOptions.mapSorter(a, b)
    }
    const hex = toHex(encode({ b: 1, a: 2, c: { y: 1, x: 2 } }, { mapSorter }))
    assert.isAbove(calls, 0)
    assert.strictEqual(hex, toHex(encode({ b: 1, a: 2, c: { y: 1, x: 2 } })))
    assert.strictEqual(toHex(encode({ b: 1, a: 2 }, rfc8949EncodeOptions)), 'a2' + '6161' + '02' + '6162' + '01')
  })

  it('addBreakTokens takes the token path', () => {
    const fast = toHex(encode({ b: 1, a: 2, c: { y: 1, x: 2 } }))
    const hex = toHex(encode({ b: 1, a: 2, c: { y: 1, x: 2 } }, { addBreakTokens: true }))
    assert.strictEqual(hex.slice(0, 2), fast.slice(0, 2))
    assert.strictEqual(hex.slice(2, 14), fast.slice(2, 14))
  })

  it('encodeInto matches', () => {
    const v = { z: [1, { b: 1, a: 2 }], y: 'str' }
    const expected = encode(v)
    const dest = new Uint8Array(expected.length + 4)
    const { written } = encodeInto(v, dest)
    assert.strictEqual(toHex(dest.subarray(0, written)), toHex(expected))
  })

  it('100k keys', function () {
    this.timeout(20000)
    const o = {}
    for (let i = 0; i < 100000; i++) o[`key${(i * 48271) % 1000003}`] = i
    const fast = encode(o)
    const general = encode(o, generalPath)
    assert.strictEqual(toHex(fast), toHex(general))
    assert.isAbove(fast.length, 100000)
  })

  it('enumerates keys once when falling back', () => {
    for (const fn of [(v) => encode(v), (v) => encodeInto(v, new Uint8Array(64))]) {
      let calls = 0
      const target = { a: 1, é: 2 }
      const proxy = new Proxy(target, {
        ownKeys () { calls++; return calls === 1 ? ['é'] : ['a'] }
      })
      fn(proxy)
      assert.strictEqual(calls, 1)
    }
    const target = { é: 1 }
    const proxy = new Proxy(target, { ownKeys () { return ['é'] } })
    assert.strictEqual(toHex(encode(proxy)), toHex(encode({ é: 1 })))
  })
})
