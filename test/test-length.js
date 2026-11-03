/* eslint-env mocha */

import * as chai from 'chai'
import { garbage } from 'ipld-garbage'
import { uintBoundaries } from '../lib/0uint.js'
import { encode, encodeInto } from '../cborg.js'
import { encodedLength } from '../lib/length.js'
import { dateEncoder } from './common.js'

const { assert } = chai

function verifyLength (object, options) {
  const len = encodedLength(object, options)
  const encoded = encode(object, options)
  const actual = encoded.length
  assert.strictEqual(actual, len, JSON.stringify(object))
}

describe('encodedLength', () => {
  it('int boundaries', () => {
    for (let ii = 0; ii < 4; ii++) {
      verifyLength(uintBoundaries[ii])
      verifyLength(uintBoundaries[ii] - 1)
      verifyLength(uintBoundaries[ii] + 1)
      verifyLength(-1 * uintBoundaries[ii])
      verifyLength(-1 * uintBoundaries[ii] - 1)
      verifyLength(-1 * uintBoundaries[ii] + 1)
    }
  })

  it('tags', () => {
    verifyLength({ date: new Date('2013-03-21T20:04:00Z') }, { typeEncoders: { Date: dateEncoder } })
  })

  it('floats', () => {
    verifyLength(0.5)
    verifyLength(0.5, { float64: true })
    verifyLength(8.940696716308594e-08)
    verifyLength(8.940696716308594e-08, { float64: true })
  })

  it('small garbage', function () {
    this.timeout(10000)
    for (let ii = 0; ii < 1000; ii++) {
      const gbg = garbage(1 << 6, { weights: { CID: 0 } })
      verifyLength(gbg)
    }
  })

  it('medium garbage', function () {
    this.timeout(10000)
    for (let ii = 0; ii < 100; ii++) {
      const gbg = garbage(1 << 16, { weights: { CID: 0 } })
      verifyLength(gbg)
    }
  })

  it('large garbage', function () {
    this.timeout(10000)
    for (let ii = 0; ii < 10; ii++) {
      const gbg = garbage(1 << 20, { weights: { CID: 0 } })
      verifyLength(gbg)
    }
  })

  describe('BigInt range', () => {
    const tooBig = [2n ** 64n, -(2n ** 64n) - 1n, 2n ** 70n, -(2n ** 70n)]
    const inRange = [2n ** 64n - 1n, -(2n ** 64n)]
    const rangeErr = /^CBOR encode error: encountered BigInt larger than allowable range$/

    it('encode, encodedLength and encodeInto agree on out of range values', () => {
      for (const v of tooBig) {
        assert.throws(() => encode(v), rangeErr, `encode ${v}`)
        assert.throws(() => encodedLength(v), rangeErr, `encodedLength ${v}`)
        assert.throws(() => encodeInto(v, new Uint8Array(16)), rangeErr, `encodeInto ${v}`)
        assert.throws(() => encodedLength([v]), rangeErr, `encodedLength [${v}]`)
      }
    })

    it('boundary values agree', () => {
      for (const v of inRange) {
        assert.strictEqual(encodedLength(v), 9)
        assert.strictEqual(encode(v).length, 9)
        assert.strictEqual(encodeInto(v, new Uint8Array(16)).written, 9)
      }
    })
  })
})
