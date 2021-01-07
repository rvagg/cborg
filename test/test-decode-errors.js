/* eslint-env mocha */

import chai from 'chai'

import { decode } from '../cborg.js'
import { fromHex } from '../lib/byte-utils.js'

const { assert } = chai

describe('decode errors', () => {
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
})
