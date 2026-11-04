/* eslint-env mocha */

import * as chai from 'chai'
import { encode, encodeInto, Token, Type, Tagged, objectToTokens } from '../cborg.js'
import { encode as jsonEncode } from '../lib/json/json.js'
import { encode as extendedEncode } from '../lib/extended/extended.js'
import { encodedLength } from '../lib/length.js'
import { toHex } from '../lib/byte-utils.js'

const { assert } = chai

const hex = (/** @type {any} */ v, /** @type {any} */ opts) => toHex(encode(v, opts))
const errOf = (/** @type {() => any} */ fn) => {
  try {
    fn()
  } catch (e) {
    return /** @type {Error} */ (e).message
  }
}

const values = [
  0, -0, 1, -1, 23, 24, 255, 65536, 2 ** 32, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER,
  NaN, Infinity, -Infinity, 1.5, 5e-324, 1.1,
  0n, 1n, -1n, 2n ** 64n - 1n, -(2n ** 64n),
  '', 'a', 'é', 'a'.repeat(1000),
  true, false
]

const optionSets = {
  default: undefined,
  float64: { float64: true },
  addBreakTokens: { addBreakTokens: true },
  rfc8949: { mapSorter: null }
}

describe('boxed primitives', () => {
  it('reproduce the vectors from the original bug', () => {
    assert.strictEqual(hex(new Number(1)), '01') // eslint-disable-line no-new-wrappers
    assert.strictEqual(hex(new Boolean(true)), 'f5') // eslint-disable-line no-new-wrappers
    assert.strictEqual(hex(new String('a')), '6161') // eslint-disable-line no-new-wrappers
    assert.strictEqual(hex(Object(1n)), '01')
    assert.strictEqual(hex([new Number(5)]), '8105') // eslint-disable-line no-new-wrappers
  })

  for (const [name, opts] of Object.entries(optionSets)) {
    it(`encode the bytes of the primitive (${name})`, () => {
      for (const v of values) {
        const expected = hex(v, opts)
        assert.strictEqual(hex(Object(v), opts), expected, String(v))
        assert.strictEqual(toHex(encode([Object(v)], opts)), toHex(encode([v], opts)), `[${String(v)}]`)
        assert.strictEqual(encodedLength(Object(v), opts), expected.length / 2, `length ${String(v)}`)
        const dest = new Uint8Array(expected.length / 2 + 8)
        const { written } = encodeInto(Object(v), dest, opts)
        assert.strictEqual(toHex(dest.subarray(0, written)), expected, `encodeInto ${String(v)}`)
      }
    })
  }

  it('the direct path and the token path agree', () => {
    for (const v of values) {
      assert.strictEqual(hex(Object(v)), hex(Object(v), { addBreakTokens: true }), String(v))
    }
  })

  it('throw like the primitive', () => {
    for (const v of [2n ** 64n, -(2n ** 64n) - 1n]) {
      const expected = errOf(() => encode(v))
      assert.match(expected, /too large|BigInt|bignum|range/i)
      assert.strictEqual(errOf(() => encode(Object(v))), expected)
    }
  })

  it('Symbol objects are unsupported', () => {
    assert.match(errOf(() => encode(Object(Symbol('s')))), /^CBOR encode error: unsupported type: Symbol$/)
    assert.match(errOf(() => encode([Object(Symbol('s'))])), /unsupported type: Symbol$/)
    assert.match(errOf(() => encode(Symbol('s'))), /unsupported type: symbol$/)
  })

  it('nest in arrays, objects, Maps and Tagged', () => {
    /* eslint-disable no-new-wrappers */
    const boxed = { a: new Number(1), bb: new String('x'), c: [new Boolean(false), Object(2n)] }
    const plain = { a: 1, bb: 'x', c: [false, 2n] }
    for (const opts of Object.values(optionSets)) {
      assert.strictEqual(hex(boxed, opts), hex(plain, opts))
    }
    assert.strictEqual(hex(new Map([[new String('k'), new Number(1)]]), { mapSorter: null }), hex(new Map([['k', 1]]), { mapSorter: null }))
    assert.strictEqual(hex(new Map([[new String('k'), new Number(1)]])), hex(new Map([['k', 1]])))
    assert.strictEqual(hex(new Tagged(5, new Number(1))), hex(new Tagged(5, 1)))
    assert.strictEqual(hex(new Tagged(5, new Number(1)), { addBreakTokens: true }), hex(new Tagged(5, 1), { addBreakTokens: true }))
    /* eslint-enable no-new-wrappers */
  })

  it('Object keys on the ASCII fast path hold boxed values', () => {
    const o = { b: new Number(2), a: Object(1n), ccc: new String('z'), d: new Boolean(true) } // eslint-disable-line no-new-wrappers
    assert.strictEqual(hex(o), hex({ b: 2, a: 1, ccc: 'z', d: true }))
  })

  it('subclasses unbox like their base', () => {
    class N extends Number {}
    class S extends String {}
    class B extends Boolean {}
    assert.strictEqual(hex(new N(7)), '07')
    assert.strictEqual(hex(new N(1.5)), hex(1.5))
    assert.strictEqual(hex(new S('hi')), '626869')
    assert.strictEqual(hex(new B(true)), 'f5')
    assert.strictEqual(hex([new N(7)], { addBreakTokens: true }), '8107')
  })

  it('primitive typeEncoders apply to the unboxed value', () => {
    const typeEncoders = {
      number (n) {
        if (Number.isNaN(n) || n === Infinity || n === -Infinity) throw new Error('non-finite is not supported')
        return null
      },
      string: (s) => new Token(Type.string, s.toUpperCase()),
      boolean: () => new Token(Type.uint, 9),
      bigint: () => new Token(Type.uint, 8)
    }
    const opts = { float64: true, typeEncoders }
    for (const bad of [NaN, Infinity, -Infinity]) {
      const expected = errOf(() => encode(bad, opts))
      assert.strictEqual(expected, 'non-finite is not supported')
      assert.strictEqual(errOf(() => encode(Object(bad), opts)), expected)
      assert.strictEqual(errOf(() => encode([{ x: Object(bad) }], opts)), expected)
    }
    assert.strictEqual(hex(Object(1.5), opts), hex(1.5, opts))
    assert.strictEqual(hex(Object('a'), opts), '6141')
    assert.strictEqual(hex(Object(true), opts), '09')
    assert.strictEqual(hex(Object(1n), opts), '08')
  })

  it('custom Number, String, Boolean and BigInt typeEncoders see the boxed object', () => {
    const seen = []
    const typeEncoders = { Number: (o) => { seen.push(o); return new Token(Type.uint, 3) } }
    // eslint-disable-next-line no-new-wrappers
    assert.strictEqual(hex(new Number(1), { typeEncoders }), '03')
    assert.strictEqual(seen.length, 1)
    assert.strictEqual(hex(1, { typeEncoders }), '01')
  })

  it('objectToTokens unboxes', () => {
    const tokens = /** @type {Token} */ (objectToTokens(Object(5)))
    assert.strictEqual(tokens.type, Type.uint)
    assert.strictEqual(tokens.value, 5)
  })

  describe('objects that only claim the tag', () => {
    // a class instance, so it misses the plain-object fast path and reaches the tag lookup
    const spoof = (/** @type {string} */ tag) => {
      class Spoof {
        get [Symbol.toStringTag] () { return tag }
        valueOf () { return this }
      }
      return new Spoof()
    }

    for (const tag of ['Number', 'String', 'Boolean', 'BigInt']) {
      it(`${tag} tag without the internal slot is rejected`, () => {
        const self = spoof(tag)
        for (const opts of Object.values(optionSets)) {
          assert.strictEqual(
            errOf(() => encode(self, opts)),
            `CBOR encode error: unsupported type: ${tag} (object only claims the tag via Symbol.toStringTag)`)
          assert.match(errOf(() => encode([{ a: self }], opts)), /unsupported type: /)
        }
        assert.match(errOf(() => encodedLength(self)), /unsupported type/)
        assert.match(errOf(() => encodeInto(self, new Uint8Array(16))), /unsupported type/)
      })
    }

    it('a boxed value with a replaced Symbol.toStringTag keeps map behaviour', () => {
      // eslint-disable-next-line no-new-wrappers
      const n = Object.assign(new Number(1), { [Symbol.toStringTag]: 'Other' })
      assert.strictEqual(hex(n), 'a0')
    })
  })

  describe('cross-realm', () => {
    /** @type {(code: string) => any} */
    let run

    before(async function () {
      if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
        return this.skip()
      }
      const specifier = 'node:vm'
      const vm = await import(/* webpackIgnore: true */ specifier)
      run = (code) => vm.runInNewContext(code)
    })

    it('unbox foreign boxed values', () => {
      const cases = [
        ['new Number(1)', '01'],
        ['new Number(1.5)', hex(1.5)],
        ['new String("a")', '6161'],
        ['new Boolean(true)', 'f5'],
        ['Object(1n)', '01'],
        ['Object(2n ** 64n - 1n)', hex(2n ** 64n - 1n)]
      ]
      for (const [code, expected] of cases) {
        assert.strictEqual(hex(run(code)), expected, code)
        assert.strictEqual(hex(run(code), { addBreakTokens: true }), expected, code)
        assert.strictEqual(encodedLength(run(code)), expected.length / 2, code)
        assert.strictEqual(hex([run(code)]), '81' + expected, code)
      }
    })

    it('foreign Symbol objects are unsupported', () => {
      assert.match(errOf(() => encode(run('Object(Symbol())'))), /unsupported type: Symbol$/)
    })

    it('a foreign spoofed tag is rejected', () => {
      const o = run('new (class { get [Symbol.toStringTag] () { return "Number" } valueOf () { return this } })()')
      assert.match(errOf(() => encode(o)), /unsupported type: Number \(object only claims/)
    })
  })

  describe('JSON and extended', () => {
    const json = (/** @type {any} */ v) => new TextDecoder().decode(jsonEncode(v))

    it('JSON encodes boxed values as their primitives', () => {
      for (const v of [0, 1, -5, 1.5, 'a', 'é', true, false]) {
        assert.strictEqual(json(Object(v)), json(v), String(v))
        assert.strictEqual(json([Object(v)]), json([v]), String(v))
      }
      assert.strictEqual(json({ b: Object(1), a: Object('x') }), '{"a":"x","b":1}')
    })

    it('JSON rejects what the primitive rejects', () => {
      for (const v of [NaN, Infinity, -Infinity]) {
        const expected = errOf(() => json(v))
        assert.isString(expected)
        assert.strictEqual(errOf(() => json(Object(v))), expected)
      }
    })

    it('extended encodes boxed values as their primitives', () => {
      /* eslint-disable no-new-wrappers */
      for (const v of [1, 1.5, 'a', true, 2n, NaN]) {
        assert.strictEqual(toHex(extendedEncode(Object(v))), toHex(extendedEncode(v)), String(v))
      }
      assert.strictEqual(toHex(extendedEncode([new Number(1)])), toHex(extendedEncode([1])))
      /* eslint-enable no-new-wrappers */
    })
  })
})
