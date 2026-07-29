/* eslint-env mocha */

import * as chai from 'chai'
import { Bl, U8Bl } from '../lib/bl.js'

const { assert } = chai

describe('Internal bytes list', () => {
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

  describe('pushByte', () => {
    it('interleaves individual and grouped writes', () => {
      const bl = new Bl(4)
      bl.pushByte(1)
      bl.push([2, 3])
      bl.pushByte(4)
      bl.pushByte(5)
      assert.deepEqual([...bl.toBytes()], [1, 2, 3, 4, 5])
    })

    it('writes into a fixed destination', () => {
      const destination = new Uint8Array(2)
      const bl = new U8Bl(destination)
      bl.pushByte(1)
      bl.pushByte(2)
      assert.deepEqual([...bl.toBytes()], [1, 2])
      assert.throws(() => bl.pushByte(3), /write out of bounds/)
    })
  })
})
