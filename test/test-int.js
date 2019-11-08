/* eslint-env mocha */

const { decode } = require('../')
const assert = require('assert')
const { hexToUint8Array } = require('./common.js')

// some from https://github.com/PJK/libcbor

const fixtures = [
  { data: '00', expected: 0, type: 'uint8' },
  { data: '02', expected: 2, type: 'uint8' },
  { data: '02', expected: 2, type: 'uint8' },
  { data: '18ff', expected: 255, type: 'uint8' },
  { data: '1901f4', expected: 500, type: 'uint16' },
  { data: '1a000f4240', expected: 1000000, type: 'int32' },
  { data: '1aa5f702b3', expected: 2784428723, type: 'uint32' },
  { data: '1ba5f702b3a5f702b3', expected: 11959030306112471731, type: 'uint64' }
]

describe('uint', () => {
  for (const fixture of fixtures) {
    it(`should decode ${fixture.type}=${fixture.expected}`, () => {
      assert.strictEqual(decode(hexToUint8Array(fixture.data)), fixture.expected, `decode ${fixture.type}`)
    })
  }
})
