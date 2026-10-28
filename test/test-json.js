/* eslint-env mocha,es2020 */

import { assert } from 'chai'
import { decode, decodeFirst, encode } from 'cborg/json'

const toBytes = (str) => new TextEncoder().encode(str)

function verifyRoundTrip (obj, sorting) {
  const encoded = new TextDecoder().decode(encode(obj, sorting === false ? { mapSorter: null } : undefined))
  const json = JSON.stringify(obj)
  assert.strictEqual(encoded, json)
  const decoded = decode(toBytes(JSON.stringify(obj)))
  assert.deepStrictEqual(decoded, obj)
}

function verifyEncodedForm (testCase) {
  // round trip the original object
  const obj = JSON.parse(testCase)
  const encoded = encode(obj)
  assert.strictEqual(new TextDecoder().decode(encoded), JSON.stringify(obj))
  const decoded = decode(encoded)
  assert.deepStrictEqual(decoded, obj)
  // now look at the original form
  const decoded2 = decode(toBytes(testCase))
  assert.deepStrictEqual(decoded2, obj)
}

describe('json basics', () => {
  it('can round-trip basic literals', () => {
    const testCases = [
      'null',
      'true',
      'false',
      '0',
      '9007199254740991',
      '-9007199254740991',
      JSON.stringify(Number.MAX_VALUE),
      JSON.stringify(Number.MIN_VALUE)
    ]

    for (const testCase of testCases) {
      verifyEncodedForm(testCase)
    }
    assert.strictEqual(decode(toBytes('1E1')), 10)
    assert.strictEqual(decode(toBytes('0.1e1')), 1)
    assert.strictEqual(decode(toBytes('1e-1')), 0.1)
    assert.strictEqual(decode(toBytes('1e+00')), 1)
    assert.strictEqual(decode(toBytes('10.0')), 10)
    assert.deepStrictEqual(decode(toBytes('[-10.0,1.0,0.0,100.0]')), [-10, 1, 0, 100])
    verifyRoundTrip(true)
    verifyRoundTrip(false)
    verifyRoundTrip(null)
    verifyRoundTrip(100)
    verifyRoundTrip(-100)
    verifyRoundTrip(1.11)
    verifyRoundTrip(-100.11111)
    verifyRoundTrip(1.11e10)
    verifyRoundTrip(1.0011111e-18)
  })

  it('handles large integers as BigInt', () => {
    const verify = (inp, str) => {
      if (str === undefined) {
        str = String(inp)
      }
      assert.strictEqual(decode(toBytes(str), { allowBigInt: true }), inp)
      assert.strictEqual(decode(toBytes(str)), parseFloat(str)) // no BigInt for you
    }
    verify(Number.MAX_SAFE_INTEGER)
    verify(-Number.MAX_SAFE_INTEGER)
    verify(BigInt('9007199254740992')) // Number.MAX_SAFE_INTEGER+1
    verify(BigInt('9007199254740993'))
    verify(BigInt('11959030306112471731'))
    verify(BigInt('18446744073709551615')) // max uint64
    verify(BigInt('9223372036854775807')) // max int64
    verify(BigInt('-9007199254740992'))
    verify(BigInt('-9007199254740993'))
    verify(BigInt('-9223372036854776000')) // min int64
    verify(BigInt('-11959030306112471732'))
    verify(BigInt('-18446744073709551616')) // min -uint64

    // these are "floats", distinct from "ints" which wouldn't have the `.` in them
    verify(-9007199254740992, '-9007199254740992.0')
    verify(-9223372036854776000, '-9223372036854776000.0')
    verify(-18446744073709551616, '-18446744073709551616.0')
  })

  it('can round-trip string literals', () => {
    const testCases = [
      JSON.stringify(''),
      JSON.stringify(' '),
      JSON.stringify('"'),
      JSON.stringify('\\'),
      JSON.stringify('\b\f\n\r\t'),
      JSON.stringify('\u0022'),
      JSON.stringify('&#34; %22 0x22 034 &#x22;'),
      '"😀"'
    ]

    for (const testCase of testCases) {
      verifyEncodedForm(testCase)
    }
    assert.strictEqual(decode(toBytes('"/ & \\/"')), '/ & /')
    verifyRoundTrip('this is a string')
    verifyRoundTrip('this 𝄞 is a ☺☺ ♣ string ̐ ̀\n\r') // accents like  ̀ and  ̐ use two-byte utf8
    verifyRoundTrip('')
    verifyRoundTrip('foo\\bar\nbaz\tbop\rbing"bip\'bang')
  })

  it('can round-trip array literals', () => {
    const testCases = [
      '[]',
      '[null]',
      '[true, false]',
      '[ \n 0,1, 2\n ,  3,\n4] \n ',
      '[-10.0, 1.0, 0.0, 100.0]',
      '[["2 deep"]]'
    ]
    for (const testCase of testCases) {
      verifyEncodedForm(testCase)
    }
    verifyRoundTrip([1, 2, 3, 'string', true, 4])
    verifyRoundTrip([1, 2, 3, 'string', true, ['and', 'a', 'nested', 'array', true], 4])
  })

  it('can round-trip object literals', () => {
    const testCases = [
      '{}',
      '\n {\n "\\b"\n :\n""\n }\n ',
      '{"":""}',
      '{"1":{"2":0,"3":"deep"}}'
    ]
    for (const testCase of testCases) {
      verifyEncodedForm(testCase)
    }
  })

  it('will sort map keys', () => {
    const unsorted = { one: 1, two: 2, three: 3.1, str: 'string', bool: true, four: 4 }
    verifyRoundTrip(unsorted, false)
    assert.strictEqual(
      new TextDecoder().decode(encode(unsorted)),
      '{"bool":true,"four":4,"one":1,"str":"string","three":3.1,"two":2}')
  })

  it('can handle novel cases', () => {
    assert.strictEqual(decode(toBytes('"this \\uD834\\uDD1E is a \\u263a\\u263a string"')), 'this 𝄞 is a ☺☺ string')
    verifyRoundTrip({ one: 1, two: 2, three: 3.1, str: 'string', arr: ['and', 'a', 'nested', [], 'array', [true, 1], false], bool: true, obj: { nested: 'object', a: [], o: {} }, four: 4 }, false)
    verifyRoundTrip([false, [{ '#nFzU': {}, '\\w>': -0.9441451951197325, "\t'": "'JB+2Wg\tw\"IrM*#e^L/d&4rrzUuwq(1mH6aVRredB&Bfs]S\"KqK(Tz1Q\"URBAfw", '\n@FrfM': 'M[D]q&' }, "J4>'Xdc+u2$%", 4227406737130333]], false)
    verifyRoundTrip([0.12995619865708727, -4973404279772543, { drG2: [true], ';#K^Qf>V': null, '`2=': 'ecc<e/$+-.;U>Gr5RdZDJ\n5+:{=QHNN.tVVN~dX$FWFwu`6>"&=tW!*1*^☺)JFM1p|}&X.B|${*\\f@!w2☺+' }], false)
    assert.strictEqual(`${decode(encode(9007199254740991))}`, '9007199254740991')
    assert.strictEqual(`${decode(encode(9007199254740992))}`, '9007199254740992')
    assert.strictEqual(`${decode(encode(900719925474099100n))}`, '900719925474099100')
  })

  it('should throw on bad types', () => {
    assert.throws(() => encode(new Uint8Array([1, 2])), /CBOR encode error: unsupported type: Uint8Array/)
    assert.throws(() => encode({ boop: new Uint8Array([1, 2]) }), /CBOR encode error: unsupported type: Uint8Array/)
    assert.throws(() => encode(undefined), /CBOR encode error: unsupported type: undefined/)
    assert.throws(() => encode(new Map([[1, 2], [2, 3]])), /CBOR encode error: non-string map keys are not supported/)
    assert.throws(() => encode(new Map([[['foo', 'bar'], 2], [['bar', 'foo'], 3]])), /CBOR encode error: complex map keys are not supported/)
  })

  it('should throw on bad decode failure modes', () => {
    assert.throws(() => decode(toBytes('{"a":1 & "b":2}')), 'CBOR decode error: unexpected character at position 7, was expecting object delimiter but found \'&\'')
    assert.throws(() => decode(toBytes('{"a":1,"b"!2}')), 'CBOR decode error: unexpected character at position 10, was expecting key/value delimiter \':\' but found \'!\'')
    assert.throws(() => decode(toBytes('[1,2&3]')), 'CBOR decode error: unexpected character at position 4, was expecting array delimiter but found \'&\'')
    assert.throws(() => decode(toBytes('{"a":!}')), 'CBOR decode error: unexpected character at position 5')
    assert.throws(() => decode(toBytes('"abc')), 'CBOR decode error: unexpected end of string at position 4')
    assert.throws(() => decode(toBytes('"ab\\xc"')), 'CBOR decode error: unexpected string escape character at position 5')
    assert.throws(() => decode(toBytes('"ab\x1Ec"')), 'CBOR decode error: invalid control character at position 3')
    assert.throws(() => decode(toBytes('"ab\\')), 'CBOR decode error: unexpected string termination at position 4')
    // begining of a quoted string with 3-byte unicode sequence with the last one truncated
    assert.throws(() => decode(toBytes('"☺').subarray(0, 3)), 'CBOR decode error: unexpected unicode sequence at position 1')
    assert.throws(() => decode(toBytes('"\\uxyza"')), 'CBOR decode error: unexpected unicode escape character at position 3')
    assert.throws(() => decode(toBytes('"\\u11"')), 'CBOR decode error: unexpected end of unicode escape sequence at position 3')
    assert.throws(() => decode(toBytes('-boop')), 'CBOR decode error: unexpected token at position 1')
    assert.throws(() => decode(toBytes('{"v":nope}')), 'CBOR decode error: unexpected token at position 7, expected to find \'null\'')
    assert.throws(() => decode(toBytes('[n]')), 'CBOR decode error: unexpected end of input at position 1')
    assert.throws(() => decode(toBytes('{"v":truu}')), 'CBOR decode error: unexpected token at position 9, expected to find \'true\'')
    assert.throws(() => decode(toBytes('[tr]')), 'CBOR decode error: unexpected end of input at position 1')
    assert.throws(() => decode(toBytes('{"v":flase}')), 'CBOR decode error: unexpected token at position 7, expected to find \'false\'')
    assert.throws(() => decode(toBytes('[fa]')), 'CBOR decode error: unexpected end of input at position 1')
    assert.throws(() => decode(toBytes('-0..1')), 'CBOR decode error: unexpected token at position 3')
  })

  it('should throw when rejectDuplicateMapKeys enabled on duplicate keys', () => {
    assert.deepStrictEqual(decode(toBytes('{"foo":1,"foo":2}')), { foo: 2 })
    assert.throws(() => decode(toBytes('{"foo":1,"foo":2}'), { rejectDuplicateMapKeys: true }), /CBOR decode error: found repeat map key "foo"/)
  })

  it('decodeFirst', () => {
    /*
    const encoded = new TextDecoder().decode(encode(obj, sorting === false ? { mapSorter: null } : undefined))
    const json = JSON.stringify(obj)
    assert.strictEqual(encoded, json)
    const decoded = decode(toBytes(JSON.stringify(obj)))
    assert.deepStrictEqual(decoded, obj)
    */
    let buf = new TextEncoder().encode('{"foo":1,"bar":2}1"ping"2null3[1,2,3]""[[],[],{"boop":true}]')
    const expected = [
      { foo: 1, bar: 2 },
      1,
      'ping',
      2,
      null,
      3,
      [1, 2, 3],
      '',
      [[], [], { boop: true }]
    ]
    for (const exp of expected) {
      const [obj, rest] = decodeFirst(buf)
      assert.deepStrictEqual(exp, obj)
      buf = rest
    }
    assert.strictEqual(buf.length, 0)
  })
})

describe('json number limits', () => {
  const ones = (n) => '1'.repeat(n)
  const numErr = /CBOR decode error.*number/

  it('literals of 1000 characters decode, 1001 throw', () => {
    const opts = { allowBigInt: true }
    assert.doesNotThrow(() => decode(toBytes(ones(1000)), opts))
    assert.throws(() => decode(toBytes(ones(1001)), opts), numErr)
    assert.doesNotThrow(() => decode(toBytes('-' + ones(999)), opts))
    assert.throws(() => decode(toBytes('-' + ones(1000)), opts), numErr)
    for (const o of [undefined, opts]) {
      assert.doesNotThrow(() => decode(toBytes('1.' + ones(998)), o))
      assert.throws(() => decode(toBytes('1.' + ones(999)), o), numErr)
      assert.doesNotThrow(() => decode(toBytes('1e' + ones(998)), o))
      assert.throws(() => decode(toBytes('1e' + ones(999)), o), numErr)
    }
  })

  it('huge literals throw a decode error', () => {
    assert.throws(() => decode(toBytes(ones(200000))), numErr)
    assert.throws(() => decode(toBytes(ones(200000)), { allowBigInt: true }), numErr)
  })

  it('a 1000 digit integer is an exact BigInt with allowBigInt', () => {
    assert.strictEqual(decode(toBytes(ones(1000)), { allowBigInt: true }), BigInt(ones(1000)))
  })

  it('integers too large for a Number throw without allowBigInt', () => {
    const nines = (n) => '9'.repeat(n)
    const tooLarge = /CBOR decode error.*too large/
    assert.strictEqual(decode(toBytes(nines(308))), parseFloat(nines(308)))
    assert.throws(() => decode(toBytes(nines(309))), tooLarge)
    assert.throws(() => decode(toBytes('-' + nines(309))), tooLarge)
    assert.strictEqual(decode(toBytes(nines(309)), { allowBigInt: true }), BigInt(nines(309)))
  })

  it('floats beyond the Number range are left alone', () => {
    assert.strictEqual(decode(toBytes('1e999')), Infinity)
  })
})

describe('json non-finite and float formatting', () => {
  const str = (v) => new TextDecoder().decode(encode(v))

  it('rejects NaN, Infinity and -Infinity', () => {
    const err = /CBOR encode error: unsupported type: (NaN|Infinity|-Infinity)/
    for (const n of [NaN, Infinity, -Infinity]) {
      assert.throws(() => encode(n), err)
      assert.throws(() => encode([1, n]), err)
      assert.throws(() => encode({ a: n }), err)
      assert.throws(() => encode({ a: [{ b: n }] }), err)
      assert.throws(() => encode(new Map([['a', n]])), err)
    }
  })

  it('encodes finite floats unchanged', () => {
    const cases = [
      [0, '0'],
      [-0, '0'],
      [1.5, '1.5'],
      [1e21, '1e+21'],
      [5e-324, '5e-324'],
      [Number.MAX_VALUE, '1.7976931348623157e+308'],
      [2 ** 53 - 1, '9007199254740991'],
      [2 ** 53, '9007199254740992.0'],
      [-1.0, '-1'],
      [[1.5, 2], '[1.5,2]']
    ]
    for (const [v, expected] of cases) {
      assert.strictEqual(str(v), expected)
    }
  })

  it('decode rejects NaN and Infinity literals under dag-json-like flags', () => {
    const opts = { allowNaN: false, allowInfinity: false }
    for (const lit of ['NaN', 'Infinity', '-Infinity', '{"a":NaN}', '[Infinity]']) {
      assert.throws(() => decode(toBytes(lit), opts), /CBOR decode error/)
    }
    assert.deepStrictEqual(decode(toBytes('[1.5,-0.5]'), opts), [1.5, -0.5])
  })
})
