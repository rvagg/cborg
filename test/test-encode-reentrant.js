/* eslint-env mocha */

import * as chai from 'chai'
import { encode, Token, Type } from '../cborg.js'
import { toHex } from '../lib/byte-utils.js'

const { assert } = chai

class Foo {}

const fooEncoders = {
  Object: (/** @type {any} */ o) => o instanceof Foo ? new Token(Type.bytes, encode({ q: 1 })) : null
}

describe('encode re-entrancy', () => {
  it('nested encode() from a type encoder', () => {
    const out = encode(['aaaa', new Foo(), 'bbbb'], { typeEncoders: fooEncoders })
    assert.strictEqual(toHex(out), '83' + '6461616161' + '44a1617101' + '6462626262')
  })

  it('nested encode() from a getter', () => {
    const out = encode([1, 2, { get a () { return encode('z') } }])
    assert.strictEqual(toHex(out), '83' + '01' + '02' + 'a1' + '6161' + '42617a')
  })

  it('nested encode() three levels deep', () => {
    const out = encode([1, {
      get a () {
        return encode([2, {
          get b () { return encode([3, { get c () { return encode('x') } }]) }
        }])
      }
    }, 4])
    // 'x' -> 6178; [3,{c:h'6178'}]; [2,{b:...}]; [1,{a:...},4]
    const inner = '82' + '03' + 'a1' + '6163' + '426178'
    const mid = '82' + '02' + 'a1' + '6162' + '48' + inner
    const expected = '83' + '01' + 'a1' + '6161' + '4e' + mid + '04'
    assert.strictEqual(toHex(out), expected)
  })

  it('nested encode() with custom options inside a direct encode', () => {
    const out = encode(['aaaa', {
      get a () { return encode([7], { addBreakTokens: true }) }
    }])
    assert.strictEqual(toHex(out), '82' + '6461616161' + 'a1' + '6161' + '438107f7')
  })

  it('exception after a nested encode leaves the writer usable', () => {
    assert.throws(() => encode([1, 2, {
      get a () { encode('z'); throw new Error('boom') }
    }]), /boom/)
    assert.throws(() => encode([1, Symbol('x')]), /unsupported type/i)
    assert.strictEqual(toHex(encode([1, 2])), '820102')
    assert.strictEqual(toHex(encode([1, { get a () { return encode('z') } }])), '82' + '01' + 'a1' + '6161' + '42617a')
  })

  it('following ordinary encode() is unaffected', () => {
    encode(['aaaa', new Foo()], { typeEncoders: fooEncoders })
    assert.strictEqual(toHex(encode({ a: 1 })), 'a1616101')
  })
})
