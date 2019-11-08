/* eslint-env mocha */

const { decode } = require('../')
const assert = require('assert')
const { hexToUint8Array } = require('./common.js')

// some from https://github.com/PJK/libcbor

const fixtures = [
  { data: '20', expected: -1, type: 'negint8' },
  { data: '22', expected: -3, type: 'negint8' },
  { data: '3863', expected: -100, type: 'negint8' },
  { data: '38ff', expected: -256, type: 'negint8' },
  { data: '3901f4', expected: -501, type: 'negint16' },
  { data: '3aa5f702b3', expected: -2784428724, type: 'negint32' },
  { data: '3ba5f702b3a5f702b3', expected: -11959030306112471732, type: 'negint64' }
]

describe('negint', () => {
  for (const fixture of fixtures) {
    it(`should decode ${fixture.type}=${fixture.expected}`, () => {
      assert.strictEqual(decode(hexToUint8Array(fixture.data)), fixture.expected, `decode ${fixture.type}`)
    })
  }
})
