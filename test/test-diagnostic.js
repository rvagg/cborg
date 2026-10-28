/* eslint-env mocha */

import * as chai from 'chai'
import { tokensToDiagnostic, fromDiag } from '../lib/diagnostic.js'
import { toHex, fromHex } from '../lib/byte-utils.js'
import { encode } from '../cborg.js'

const { assert } = chai

const diag = (/** @type {any} */ value) => [...tokensToDiagnostic(encode(value))].join('\n')
const diagHex = (/** @type {string} */ hex) => [...tokensToDiagnostic(fromHex(hex))].join('\n')

// every printed comment for a string is the quoted text after the final `# `
const comments = (/** @type {string} */ out) => out.split('\n').map((l) => l.replace(/^.*?# +/, ''))

// raw control characters; the newline joining output lines is removed first
const controls = /[\p{Cc}\u2028\u2029\u202e]/u

describe('diagnostic', () => {
  describe('text string escaping', () => {
    const cases = [
      ['ESC', '\x1b[31m', '\\x1b[31m'],
      ['NUL', 'a\x00b', 'a\\x00b'],
      ['LF', 'a\nb', 'a\\x0ab'],
      ['CR', 'a\rb', 'a\\x0db'],
      ['TAB', 'a\tb', 'a\\x09b'],
      ['DEL', 'a\x7fb', 'a\\x7fb'],
      ['C1 0x80', 'a\x80b', 'a\\x80b'],
      ['C1 0x9b (CSI)', 'a\x9bb', 'a\\x9bb'],
      ['C1 0x9f', 'a\x9fb', 'a\\x9fb'],
      ['U+2028', 'a\u2028b', 'a\\u2028b'],
      ['U+2029', 'a\u2029b', 'a\\u2029b'],
      ['bidi override U+202E', 'a\u202eb', 'a\\u202eb']
    ]
    for (const [name, text, expected] of cases) {
      it(`escapes ${name} at top level`, () => {
        const out = diag(text)
        assert.strictEqual(out.split('\n').length, 2)
        assert.strictEqual(comments(out)[1], `"${expected}"`)
      })
      it(`escapes ${name} nested`, () => {
        const out = diag({ k: [text] })
        assert.include(out, `"${expected}"`)
        // no raw control characters survive anywhere
        assert.notMatch(out.replace(/\n/g, ''), controls)
      })
    }

    it('leaves ordinary text, non-ASCII letters and emoji unchanged', () => {
      for (const text of ['hello world', 'h\u00e9llo', '\u65e5\u672c\u8a9e', '\ud83d\ude00', '\u00a0x', '"quoted"']) {
        assert.strictEqual(comments(diag(text))[1], `"${text}"`)
      }
    })

    it('round-trips a string containing a newline, hex and comment marker', () => {
      const bytes = fromHex('66780a38302023')
      assert.strictEqual(toHex(fromDiag(diagHex('66780a38302023'))), toHex(bytes))
    })

    it('round-trips the same string inside an array', () => {
      const hex = '8266780a303120230100'
      assert.strictEqual(toHex(fromDiag(diagHex(hex))), hex)
    })

    it('round-trips control characters', () => {
      const hex = toHex(encode('\x1b[31m\r\n\u2028 80 # 01'))
      assert.strictEqual(toHex(fromDiag(diagHex(hex))), hex)
    })
  })

  describe('fromDiag', () => {
    it('parses hex with whitespace and comments', () => {
      assert.strictEqual(toHex(fromDiag('82 # array(2)\n  01 # uint(1)\r\n  02\t# uint(2)\n')), '820102')
    })

    it('parses uppercase hex', () => {
      assert.strictEqual(toHex(fromDiag('8A')), '8a')
    })

    it('parses empty input', () => {
      assert.strictEqual(fromDiag('').length, 0)
      assert.strictEqual(fromDiag('# nothing\n').length, 0)
    })

    it('joins digits split by whitespace', () => {
      assert.strictEqual(toHex(fromDiag('8 2 0 1 0 2')), '820102')
      assert.strictEqual(toHex(fromDiag('8\n0')), '80')
    })

    it('rejects odd-length hex', () => {
      for (const input of ['8', 'abc', '820', '82 01 0', '82 # c\n01 0 # d']) {
        assert.throws(() => fromDiag(input), /odd number of hex digits/, input)
      }
    })

    it('rejects an odd count of digits split across whitespace', () => {
      assert.throws(() => fromDiag('8 0 1'), /odd number of hex digits/)
    })

    it('rejects non-hex input', () => {
      assert.throws(() => fromDiag('zz'), /not CBOR diagnostic format/)
    })

    it('rejects non-string input', () => {
      // @ts-ignore
      assert.throws(() => fromDiag(1), /Expected string input/)
    })
  })
})
