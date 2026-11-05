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

  describe('structure', () => {
    // collapse the padding between the hex and comment columns
    const rows = (/** @type {string} */ hex) => diagHex(hex).split('\n').map((l) => l.replace(/ +#/, ' #'))
    const partial = (/** @type {string} */ hex) => {
      const lines = []
      try {
        for (const l of tokensToDiagnostic(fromHex(hex))) lines.push(l.replace(/ +#/, ' #'))
      } catch (err) {
        return { lines, err }
      }
      return { lines, err: null }
    }

    it('shows indefinite arrays and maps with * and an aligned break', () => {
      assert.deepEqual(rows('9f0102ff'), ['9f # array(*)', '  01 #   uint(1)', '  02 #   uint(2)', 'ff # break'])
      assert.deepEqual(rows('bf616101ff'), ['bf # map(*)', '  61 #   string(1)', '    61 #     "a"', '  01 #   uint(1)', 'ff # break'])
      assert.deepEqual(rows('9fff'), ['9f # array(*)', 'ff # break'])
    })

    it('nests indefinite and definite items', () => {
      assert.deepEqual(rows('9f9f01ffff'), ['9f # array(*)', '  9f #   array(*)', '    01 #     uint(1)', '  ff #   break', 'ff # break'])
      assert.deepEqual(rows('9f8101ff'), ['9f # array(*)', '  81 #   array(1)', '    01 #     uint(1)', 'ff # break'])
      assert.deepEqual(rows('829f01ff02'), ['82 # array(2)', '  9f #   array(*)', '    01 #     uint(1)', '  ff #   break', '  02 #   uint(2)'])
    })

    it('round-trips indefinite items through fromDiag', () => {
      for (const hex of ['9f0102ff', 'bf616101ff', '9f9f01ffff', '829f01ff02']) {
        assert.strictEqual(toHex(fromDiag(diagHex(hex))), hex)
      }
    })

    it('reports truncation after printing the items it could read', () => {
      let { lines, err } = partial('a1')
      assert.deepEqual(lines, ['a1 # map(1)'])
      assert.match(String(err), /input ended inside an open item/)
      ;({ lines, err } = partial('9f01'))
      assert.deepEqual(lines, ['9f # array(*)', '  01 #   uint(1)'])
      assert.match(String(err), /input ended inside an open item/)
      ;({ err } = partial('c1'))
      assert.match(String(err), /open item/)
    })

    it('rejects every strict prefix of a valid item', () => {
      const fixtures = [
        '8301820203820405', 'a3616101616282020365736d696c6564f09f9880', '9f0102ff', 'bf616101ff',
        '829f01ff02', 'c11a514b67b0', 'd82a4100', '9f9f01ffff', 'a1618101', '5820' + '00'.repeat(32)
      ]
      for (const hex of fixtures) {
        assert.doesNotThrow(() => diagHex(hex), hex)
        for (let n = 2; n < hex.length; n += 2) {
          assert.throws(() => diagHex(hex.slice(0, n)), /CBOR decode error/, `${hex} cut at ${n / 2}`)
        }
      }
    })

    it('rejects a break outside an indefinite item', () => {
      for (const hex of ['ff', '8309ff', '9f01ffff', 'a1ff']) {
        assert.throws(() => diagHex(hex), /unexpected break|not enough/, hex)
      }
    })

    it('shows the length bytes of non-minimal lengths', () => {
      assert.deepEqual(rows('9800'), ['98 00 # array(0)'])
      assert.deepEqual(rows('980000'), ['98 00 # array(0)', '00 # uint(0)'])
      assert.deepEqual(rows('5800'), ['58 00 # bytes(0)'])
      assert.deepEqual(rows('7800'), ['78 00 # string(0)'])
      assert.deepEqual(rows('b900000000'.slice(0, 6)), ['b9 0000 # map(0)'])
      assert.deepEqual(rows('5a00000001ff'), ['5a 00000001 # bytes(1)', '  ff #   "ÿ"'])
    })
  })

  describe('values', () => {
    const first = (/** @type {string} */ hex) => diagHex(hex).split('\n')[0].replace(/^.*?# /, '')

    it('counts string bytes, as the header does', () => {
      assert.strictEqual(first(toHex(encode('€'))), 'string(3)')
      assert.strictEqual(first(toHex(encode('😀'))), 'string(4)')
      assert.strictEqual(first(toHex(encode('abc'))), 'string(3)')
      // invalid UTF-8 is shown as the original bytes
      assert.strictEqual(first('62ff41'), 'string(2)')
    })

    it('shows negative zero', () => {
      for (const hex of ['f98000', 'fa80000000', 'fb8000000000000000']) {
        assert.strictEqual(first(hex), 'float(-0)')
      }
      for (const hex of ['f90000', 'fa00000000', 'fb0000000000000000']) {
        assert.strictEqual(first(hex), 'float(0)')
      }
    })
  })

  describe('text snippets', () => {
    it('never splits a character across lines', () => {
      const texts = ['€€€€€€', '😀a😀b😀', 'aé€😀aé€😀', '😀'.repeat(9)]
      for (const text of texts) {
        for (let width = 20; width <= 60; width++) {
          const lines = [...tokensToDiagnostic(encode(text), width)].slice(1)
          const joined = lines.map((l) => l.replace(/^.*?# +"|"$/g, '')).join('')
          assert.strictEqual(joined, text, `${text} at width ${width}`)
          assert.notInclude(joined, '�')
        }
      }
    })

    it('distinguishes a literal backslash from an escape', () => {
      const literal = comments(diag('x\\x0ay'))[1]
      const newline = comments(diag('x\ny'))[1]
      assert.strictEqual(literal, '"x\\\\x0ay"')
      assert.strictEqual(newline, '"x\\x0ay"')
      assert.strictEqual(comments(diagHex('415c'))[1], '"\\\\"')
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
