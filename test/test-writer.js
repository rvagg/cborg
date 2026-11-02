/* eslint-env mocha */

import * as chai from 'chai'
import { U8Writer, FlatWriter } from '../lib/writer.js'

const { assert } = chai

describe('Internal byte writers', () => {
  describe('FlatWriter', () => {
    it('interleaves pushByte, pushArr, pushBytes and push', () => {
      const f = new FlatWriter()
      f.pushByte(1)
      f.pushArr([2, 3])
      f.pushBytes(Uint8Array.from([4, 5]))
      f.push([6])
      f.push(Uint8Array.from([7]))
      assert.deepEqual([...f.toBytes()], [1, 2, 3, 4, 5, 6, 7])
    })

    it('grows past its initial buffer and the segment limit', () => {
      const f = new FlatWriter()
      const expected = []
      for (let i = 0; i < 700000; i++) {
        f.pushByte(i & 0xff)
        expected.push(i & 0xff)
      }
      const out = f.toBytes()
      assert.strictEqual(out.length, expected.length)
      assert.isTrue(out.every((b, i) => b === expected[i]))
    })

    it('holds large byte arrays as segments and orders them correctly', () => {
      const f = new FlatWriter()
      const big = new Uint8Array(2000).fill(9)
      f.pushByte(1)
      f.pushBytes(big)
      f.pushArr([2])
      f.pushBytes(big)
      const out = f.toBytes()
      assert.strictEqual(out.length, 4002)
      assert.strictEqual(out[0], 1)
      assert.strictEqual(out[1], 9)
      assert.strictEqual(out[2000], 9)
      assert.strictEqual(out[2001], 2)
      assert.strictEqual(out[4001], 9)
    })

    it('toBytes() returns an exact-size copy and reset() clears state', () => {
      const f = new FlatWriter()
      f.pushArr([1, 2, 3])
      const a = f.toBytes(true)
      assert.strictEqual(a.buffer.byteLength, 3)
      f.pushArr([4])
      assert.deepEqual([...f.toBytes(true)], [4])
      assert.deepEqual([...a], [1, 2, 3])
    })

    it('keeps a mid-sized buffer after reset and drops a large one', () => {
      const f = new FlatWriter()
      f.pushBytes(new Uint8Array(900))
      f.pushBytes(new Uint8Array(900))
      f.pushBytes(new Uint8Array(900))
      f.reset()
      assert.strictEqual(f.buf.length, 4096)
      f.pushBytes(new Uint8Array(900))
      for (let i = 0; i < 100000; i++) f.pushArr([1, 2])
      f.reset()
      assert.strictEqual(f.buf.length, 4096)
    })
  })

  describe('U8Writer', () => {
    it('writes into a fixed destination', () => {
      const destination = new Uint8Array(2)
      const bl = new U8Writer(destination)
      bl.pushByte(1)
      bl.pushByte(2)
      assert.deepEqual([...bl.toBytes()], [1, 2])
      assert.throws(() => bl.pushByte(3), /write out of bounds/)
    })

    it('interleaves pushByte, pushArr, pushBytes and push', () => {
      const dest = new Uint8Array(8)
      const bl = new U8Writer(dest)
      bl.pushByte(1)
      bl.pushArr([2, 3])
      bl.pushBytes(Uint8Array.from([4, 5]))
      bl.push([6])
      bl.push(Uint8Array.from([7]))
      assert.deepEqual([...bl.toBytes()], [1, 2, 3, 4, 5, 6, 7])
      assert.strictEqual(bl.toBytes().buffer, dest.buffer)
    })

    it('throws on overflow from every push method', () => {
      for (const write of [
        (/** @type {U8Writer<ArrayBufferLike>} */ bl) => bl.push([1, 2, 3]),
        (/** @type {U8Writer<ArrayBufferLike>} */ bl) => bl.pushArr([1, 2, 3]),
        (/** @type {U8Writer<ArrayBufferLike>} */ bl) => bl.pushBytes(Uint8Array.from([1, 2, 3]))
      ]) {
        assert.throws(() => write(new U8Writer(new Uint8Array(2))), /write out of bounds/)
      }
    })

    it('reset() rewinds the cursor', () => {
      const bl = new U8Writer(new Uint8Array(2))
      bl.pushArr([1, 2])
      bl.reset()
      bl.pushArr([3])
      assert.deepEqual([...bl.toBytes()], [3])
    })
  })
})
