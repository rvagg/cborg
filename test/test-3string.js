/* eslint-env mocha */

import * as chai from 'chai'

import { decode, encode, encodeInto } from '../cborg.js'
import { fromHex, toHex } from '../lib/byte-utils.js'
import { tokensToDiagnostic } from '../lib/diagnostic.js'

const { assert } = chai

// Helper to get encoded bytes from encodeInto (which returns { written })
const encodeIntoBytes = (data, dest) => {
  const { written } = encodeInto(data, dest)
  return dest.subarray(0, written)
}

// some from https://github.com/PJK/libcbor

const fixtures = [
  { data: '60', expected: '', type: 'string' },
  { data: '6161', expected: 'a', type: 'string' },
  { data: '780161', expected: 'a', type: 'string', strict: false },
  {
    data: '6c48656c6c6f20776f726c6421',
    expected: 'Hello world!',
    type: 'string'
  },
  {
    data: '6fc48c6175657320c39f76c49b746521',
    expected: 'Čaues ßvěte!',
    type: 'string'
  },
  {
    data: '78964c6f72656d20697073756d20646f6c6f722073697420616d65742c20636f6e73656374657475722061646970697363696e6720656c69742e20446f6e6563206d692074656c6c75732c20696163756c6973206e656320766573746962756c756d20717569732c206665726d656e74756d206e6f6e2066656c69732e204d616563656e6173207574206a7573746f20706f73756572652e',
    expected: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec mi tellus, iaculis nec vestibulum quis, fermentum non felis. Maecenas ut justo posuere.',
    type: 'string',
    label: 'long string, 8-bit length'
  },
  {
    data: '7900964c6f72656d20697073756d20646f6c6f722073697420616d65742c20636f6e73656374657475722061646970697363696e6720656c69742e20446f6e6563206d692074656c6c75732c20696163756c6973206e656320766573746962756c756d20717569732c206665726d656e74756d206e6f6e2066656c69732e204d616563656e6173207574206a7573746f20706f73756572652e',
    expected: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec mi tellus, iaculis nec vestibulum quis, fermentum non felis. Maecenas ut justo posuere.',
    type: 'string',
    label: 'long string, 16-bit length',
    strict: false
  },
  {
    data: '7a000000964c6f72656d20697073756d20646f6c6f722073697420616d65742c20636f6e73656374657475722061646970697363696e6720656c69742e20446f6e6563206d692074656c6c75732c20696163756c6973206e656320766573746962756c756d20717569732c206665726d656e74756d206e6f6e2066656c69732e204d616563656e6173207574206a7573746f20706f73756572652e',
    expected: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec mi tellus, iaculis nec vestibulum quis, fermentum non felis. Maecenas ut justo posuere.',
    type: 'string',
    label: 'long string, 32-bit length',
    strict: false
  },
  {
    data: '7b00000000000000964c6f72656d20697073756d20646f6c6f722073697420616d65742c20636f6e73656374657475722061646970697363696e6720656c69742e20446f6e6563206d692074656c6c75732c20696163756c6973206e656320766573746962756c756d20717569732c206665726d656e74756d206e6f6e2066656c69732e204d616563656e6173207574206a7573746f20706f73756572652e',
    expected: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec mi tellus, iaculis nec vestibulum quis, fermentum non felis. Maecenas ut justo posuere.',
    type: 'string',
    label: 'long string, 64-bit length',
    strict: false
  }
]

const fixedDest = new Uint8Array(65536 + 8)

// fill up byte arrays converted to strings so we can validate in strict mode,
// the minimal size for each excluding 64-bit because 4G is just too big
;(() => {
  function rnd (length) {
    const sa = []
    let l = 0
    while (l < length) {
      // some unicode character, unless we're near the end and want to fill up exactly so
      // we need to pad with ascii
      const ascii = (length - l) < 3
      const base = ascii ? 32 : 0x1f000
      const max = ascii ? 126 : 0x1ff00
      const cc = Math.floor(Math.random() * (max - base)) + base
      const s = String.fromCharCode(cc)
      l += (new TextEncoder().encode(s)).length
      sa.push(s)
    }
    return sa.join('')
  }

  const expected16 = rnd(256)
  fixtures.push({
    data: new Uint8Array([...fromHex('790100'), ...(new TextEncoder().encode(expected16))]),
    expected: expected16,
    type: 'string',
    label: 'long string, 16-bit length strict-compat'
  })

  const expected32 = rnd(65536)
  fixtures.push({
    data: new Uint8Array([...fromHex('7a00010000'), ...(new TextEncoder().encode(expected32))]),
    expected: expected32,
    type: 'string',
    label: 'long string, 32-bit length strict-compat'
  })
})()

describe('string', () => {
  describe('decode', () => {
    for (const fixture of fixtures) {
      const data = fromHex(fixture.data)
      it(`should decode ${fixture.type}=${fixture.label || fixture.expected}`, () => {
        let actual = decode(data)
        assert.strictEqual(actual, fixture.expected, `decode ${fixture.type}`)
        if (fixture.strict === false) {
          assert.throws(() => decode(data, { strict: true }), Error, 'CBOR decode error: integer encoded in more bytes than necessary (strict decode)')
        } else {
          actual = decode(data, { strict: true })
          assert.strictEqual(actual, fixture.expected, `decode ${fixture.type} strict`)
        }
      })

      it('should fail to decode very large length', () => {
        assert.throws(
          () => decode(fromHex('7ba5f702b3a5f702b34c6f72656d20697073756d20646f6c6f722073697420616d65742c20636f6e73656374657475722061646970697363696e6720656c69742e20446f6e6563206d692074656c6c75732c20696163756c6973206e656320766573746962756c756d20717569732c206665726d656e74756d206e6f6e2066656c69732e204d616563656e6173207574206a7573746f20706f73756572652e')),
          /CBOR decode error: 64-bit integer string lengths not supported/)
      })

      it('decodes unpaired surrogates as U+FFFD', () => {
        assert.strictEqual(decode(fromHex('63edb88e')), '\uFFFD\uFFFD\uFFFD')
      })
    }
  })

  describe('encode', () => {
    for (const fixture of fixtures) {
      if (fixture.data.length >= 100000000) {
        it.skip(`(TODO) skipping encode of very large string ${fixture.type}=${fixture.label || fixture.expected}`, () => {})
        continue
      }

      const data = fixture.expected
      const expectedHex = toHex(fixture.data)

      it(`should encode ${fixture.type}=${fixture.label || fixture.expected}`, () => {
        if (fixture.unsafe) {
          assert.throws(() => encode(data), Error, /^CBOR encode error: number too large to encode \(-\d+\)$/)
        } else if (fixture.strict === false) {
          assert.notStrictEqual(toHex(encode(data)), expectedHex, `encode ${fixture.type} !strict`)
          assert.notStrictEqual(toHex(encodeIntoBytes(data, fixedDest)), expectedHex, `encode ${fixture.type} !strict`)
        } else {
          assert.strictEqual(toHex(encode(data)), expectedHex, `encode ${fixture.type}`)
          assert.strictEqual(toHex(encodeIntoBytes(data, fixedDest)), expectedHex, `encode ${fixture.type}`)
        }
      })

      it('should encode unpaired surrogates as U+FFFD', () => {
        // short strings
        assert.strictEqual(
          toHex(encode('😎'.slice(1))),
          toHex(encode('\uFFFD'))
        )

        // long strings (>64)
        assert.strictEqual(
          toHex(encode('A'.repeat(65) + '😎'.slice(1))),
          toHex(encode('A'.repeat(65) + '\uFFFD'))
        )
      })
    }
  })
})

describe('string U+FEFF (BOM)', () => {
  const BOM = '\uFEFF'
  const cases = {
    'BOM only': BOM,
    'short leading': `${BOM}abc`,
    'short middle': `a${BOM}bc`,
    'short trailing': `abc${BOM}`,
    'two leading': `${BOM}${BOM}abc`,
    'long leading': `${BOM}${'a'.repeat(100)}`,
    'long non-ascii leading': `${BOM}${'\u00e9'.repeat(100)}`,
    'long middle': `${'a'.repeat(50)}${BOM}${'a'.repeat(50)}`
  }

  for (const [name, str] of Object.entries(cases)) {
    it(`round-trips ${name}`, () => {
      assert.strictEqual(decode(encode(str)), str)
      assert.deepStrictEqual(decode(encode([str, { [str]: str }])), [str, { [str]: str }])
    })
  }

  it('decodes the BOM bytes', () => {
    assert.strictEqual(decode(fromHex('63efbbbf')), BOM)
    assert.strictEqual(decode(fromHex('66efbbbf616263')), `${BOM}abc`)
  })

  it('keeps BOM-prefixed map keys distinct', () => {
    const bytes = encode({ k: 1, [`${BOM}k`]: 2 })
    for (const opts of [undefined, { rejectDuplicateMapKeys: true }]) {
      const out = decode(bytes, opts)
      assert.deepStrictEqual(Object.keys(out).sort(), ['k', `${BOM}k`].sort())
      assert.strictEqual(out.k, 1)
      assert.strictEqual(out[`${BOM}k`], 2)
    }
  })

  it('shows a leading BOM in diagnostic output', () => {
    const out = [...tokensToDiagnostic(encode(`${BOM}abc`))].join('\n')
    assert.include(out, `"${BOM}abc"`)
  })
})

describe('strictUtf8', () => {
  const BOM = '﻿'
  const dagCborLike = {
    strict: true,
    rejectDuplicateMapKeys: true,
    allowIndefinite: false,
    allowNaN: false,
    allowInfinity: false,
    coerceUndefinedToNull: true,
    allowBigInt: true,
    strictUtf8: true
  }
  const longInvalid = '78' + '28' + '61'.repeat(39) + 'ff' // 40 bytes
  const invalid = {
    'lone continuation': '61ff',
    'bad continuation': '62c328',
    'lone surrogate': '63eda080',
    overlong: '62c080',
    'truncated 4-byte': '63f08080',
    'truncated 3-byte': '62e282',
    'long (> 32 bytes)': longInvalid,
    'in map key': 'a162c32801',
    'in nested array': '8161ff',
    'in map value': 'a1616162c328'
  }

  for (const [name, hex] of Object.entries(invalid)) {
    it(`rejects ${name}`, () => {
      assert.throws(() => decode(fromHex(hex), { strictUtf8: true }), /CBOR decode error:.*UTF-8/)
      assert.throws(() => decode(fromHex(hex), dagCborLike), /CBOR decode error:.*UTF-8/)
    })

    it(`still decodes ${name} with replacement by default`, () => {
      assert.doesNotThrow(() => decode(fromHex(hex)))
      assert.doesNotThrow(() => decode(fromHex(hex), { strictUtf8: false }))
      assert.doesNotThrow(() => decode(fromHex(hex), { strict: true }))
    })
  }

  it('keeps replacement decoding by default', () => {
    assert.strictEqual(decode(fromHex('61ff')), '�')
    assert.strictEqual(decode(fromHex('62c328')), '�(')
    assert.strictEqual(decode(fromHex('62c080')), '��')
    assert.deepStrictEqual(decode(fromHex('a162c32801')), decode(fromHex('a162ff2801')))
  })

  it('distinguishes the wire forms that collide by default', () => {
    for (const hex of ['a162c32801', 'a162ff2801']) {
      assert.throws(() => decode(fromHex(hex), { strictUtf8: true }), /UTF-8/)
    }
  })

  it('decodes valid text identically', () => {
    const strs = [
      '', 'a', 'a'.repeat(100), 'café', 'Èaües ß', '日本語',
      '😀', 'x😀y', BOM, `${BOM}abc`, `a${BOM}b`,
      'é'.repeat(100), '日'.repeat(40), '😀'.repeat(30), `${BOM}${'a'.repeat(100)}`,
      '\u0000', '\u007f', '\u0080', '߿', 'ࠀ', '￿', '\u{10ffff}'
    ]
    for (const str of strs) {
      const bytes = encode(str)
      assert.strictEqual(decode(bytes, { strictUtf8: true }), str)
      assert.strictEqual(decode(bytes, dagCborLike), str)
      const nested = [str, { [str]: [str] }]
      assert.deepStrictEqual(decode(encode(nested), { strictUtf8: true }), nested)
    }
  })

  it('accepts ASCII', () => {
    for (const str of ['abc', 'a'.repeat(31), 'a'.repeat(32), 'a'.repeat(1000)]) {
      assert.strictEqual(decode(encode(str), { strictUtf8: true }), str)
    }
  })

  it('rejects with retainStringBytes set', () => {
    assert.throws(() => decode(fromHex('62c328'), { strictUtf8: true, retainStringBytes: true }), /UTF-8/)
  })
})
