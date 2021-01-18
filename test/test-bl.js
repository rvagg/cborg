/* eslint-env mocha */

import chai from 'chai'
import Bl from '../lib/bl.js'

const { assert } = chai

describe('Internal bytes list', () => {
  it('sets bits, individually incremented', () => {
    const bl = new Bl(10)
    const expected = []
    for (let i = 0; i < 25; i++) {
      bl.set(0, i + 1)
      assert.strictEqual(bl.get(0), i + 1)
      bl.increment(1)
      expected.push(i + 1)
    }
    assert.deepEqual([...bl.toBytes()], expected)
  })

  it('sets bits, bulk incremented', () => {
    const bl = new Bl(10)
    const expected = []
    for (let i = 0; i < 25; i++) {
      bl.set(i, i + 1)
      assert.strictEqual(bl.get(i), i + 1)
      expected.push(i + 1)
    }
    assert.deepEqual([...bl.toBytes()], [])
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(bl.get(i), expected[i])
    }
    bl.increment(5)
    assert.deepEqual([...bl.toBytes()].slice(0, 5), expected.slice(0, 5))
    bl.increment(20)
    assert.deepEqual([...bl.toBytes()], expected)
  })

  it('sets bits, partial progressive increment', () => {
    const bl = new Bl(10)
    const expected = []
    for (let i = 0; i < 25; i++) {
      bl.set(i % 5, i + 1)
      assert.strictEqual(bl.get(i % 5), i + 1)
      expected.push(i + 1)
      if (i % 5 === 4) {
        bl.increment(5)
      }
    }
    assert.deepEqual([...bl.toBytes()], expected)
  })

  it('copyTo, easy path', () => {
    const bl = new Bl(20)
    const expected = [1, 2, 3, 4, 5, 6, 100, 110, 120, 10, 11, 12, 13]
    for (let i = 0; i < 5; i++) {
      bl.set(0, i + 1)
      assert.strictEqual(bl.get(0), i + 1)
      bl.increment(1)
    }
    // append 5 but don't increment
    bl.copyTo(0, Uint8Array.from([6, 7, 8, 9, 10]))
    // now overwrite some in the middle, then increment
    bl.set(1, 100)
    bl.copyTo(2, Uint8Array.from([110, 120]))
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(bl.get(i), expected[i + 5])
    }
    bl.increment(5)
    // append more
    bl.copyTo(0, Uint8Array.from([11, 12]))
    assert.strictEqual(bl.get(0), expected[10])
    assert.strictEqual(bl.get(1), expected[11])
    bl.increment(2)
    // add a single for good measure
    bl.set(0, 13)
    assert.strictEqual(bl.get(0), 13)
    bl.increment(1)
    assert.deepEqual([...bl.toBytes()], expected)
  })

  it('copyTo, splice', () => {
    const bl = new Bl(4) // small chunks, this will need insertions but we'll control where
    const expected = [1, 2, 3, 4, 5, 6, 100, 110, 120, 10, 11, 12, 13]
    for (let i = 0; i < 5; i++) {
      bl.set(0, i + 1)
      assert.strictEqual(bl.get(0), i + 1)
      bl.increment(1)
    }
    // append 5 but don't increment
    bl.copyTo(0, Uint8Array.from([6, 7, 8, 9, 10]))
    // now overwrite some in the middle, then increment
    bl.set(1, 100)
    bl.copyTo(2, Uint8Array.from([110, 120]))
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(bl.get(i), expected[i + 5])
    }
    bl.increment(5)
    // append more
    bl.copyTo(0, Uint8Array.from([11, 12]))
    assert.strictEqual(bl.get(0), expected[10])
    assert.strictEqual(bl.get(1), expected[11])
    bl.increment(2)
    // add a single for good measure
    bl.set(0, 13)
    assert.strictEqual(bl.get(0), 13)
    bl.increment(1)
    assert.deepEqual([...bl.toBytes()], expected)
  })

  it('copyTo, insert', () => {
    const bl = new Bl(4) // small chunks, this will need insertions but we'll control where
    const expected = [1, 2, 3, 4, 5, 6, 100, 110, 120, 10, 11, 12, 13, 14, 15, 16, 17]
    for (let i = 0; i < 5; i++) {
      bl.set(0, i + 1)
      assert.strictEqual(bl.get(0), i + 1)
      bl.increment(1)
    }
    // append 5 but don't increment
    bl.copyTo(0, Uint8Array.from([6, 7, 8, 9, 10]))
    // now overwrite some in the middle, then increment
    bl.set(1, 100)
    bl.copyTo(2, Uint8Array.from([110, 120]))
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(bl.get(i), expected[i + 5])
    }
    bl.increment(5)
    // append more
    bl.copyTo(0, Uint8Array.from([11, 12, 13, 14, 15, 16]))
    for (let i = 0; i < 6; i++) {
      assert.strictEqual(bl.get(i), expected[i + 10])
    }
    bl.increment(6)
    // add a single for good measure
    bl.set(0, 17)
    assert.strictEqual(bl.get(0), 17)
    bl.increment(1)
    assert.deepEqual([...bl.toBytes()], expected)
  })

  describe('push', () => {
    it('push bits', () => {
      const bl = new Bl(10)
      const expected = []
      for (let i = 0; i < 25; i++) {
        bl.push([i + 1])
        expected.push(i + 1)
      }
      assert.deepEqual([...bl.toBytes()], expected)
    })

    for (let i = 4; i < 21; i++) {
      it(`push Bl(${i})`, () => {
        const bl = new Bl(i)
        const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 110, 120, 11, 12, 130, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
        for (let i = 0; i < 5; i++) {
          bl.push([i + 1])
        }
        bl.push(Uint8Array.from([6, 7, 8, 9, 10]))
        bl.push([100])
        bl.push(Uint8Array.from([110, 120]))
        bl.push(Uint8Array.from([11, 12]))
        bl.push([130])
        bl.push(Uint8Array.from([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]))
        assert.deepEqual([...bl.toBytes()], expected)
      })
    }
  })
})
