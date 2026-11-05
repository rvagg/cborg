/* eslint-env mocha */

import * as chai from 'chai'
import { tagName, readVarint, toBase32, toBase58btc, decodeCid, bignum, epochDate } from '../lib/diagnostic-tags.js'
import { fromHex } from '../lib/byte-utils.js'

const { assert } = chai

const utf8 = (/** @type {string} */ s) => new TextEncoder().encode(s)

describe('diagnostic tags', () => {
  describe('tagName', () => {
    it('names registered tags', () => {
      assert.strictEqual(tagName(0), 'date/time string')
      assert.strictEqual(tagName(42), 'CID')
      assert.strictEqual(tagName(86), 'float64 LE array')
      assert.strictEqual(tagName(55799), 'self-described CBOR')
    })

    it('leaves unknown and reserved tags unnamed', () => {
      assert.strictEqual(tagName(76), undefined)
      assert.strictEqual(tagName(99), undefined)
      assert.strictEqual(tagName(2n ** 64n - 1n), undefined)
    })
  })

  describe('readVarint', () => {
    const cases = [
      ['00', 0, 1],
      ['7f', 127, 1],
      ['8001', 128, 2],
      ['ff01', 255, 2],
      ['ac02', 300, 2],
      ['808001', 16384, 3],
      ['a902', 0x0129, 2],
      ['81e203', 0xf101, 3]
    ]
    for (const [hex, value, length] of cases) {
      it(`reads ${hex}`, () => {
        assert.deepEqual(readVarint(fromHex(`${hex}ff`), 0), [value, length])
      })
    }

    it('reads at an offset', () => {
      assert.deepEqual(readVarint(fromHex('ffac02'), 1), [300, 2])
    })

    it('rejects truncated input', () => {
      assert.throws(() => readVarint(fromHex(''), 0), /truncated varint/)
      assert.throws(() => readVarint(fromHex('80'), 0), /truncated varint/)
    })

    it('rejects non-minimal encodings', () => {
      assert.throws(() => readVarint(fromHex('8000'), 0), /not minimally encoded/)
      assert.throws(() => readVarint(fromHex('ff8000'), 0), /not minimally encoded/)
    })

    it('rejects values beyond the safe integer range', () => {
      assert.throws(() => readVarint(fromHex('ffffffffffffffff7f'), 0), /too large/)
    })

    it('rejects more than 9 bytes', () => {
      assert.throws(() => readVarint(fromHex('80808080808080808001'), 0), /longer than 9 bytes/)
    })
  })

  // RFC 4648 section 10, lower case and unpadded
  describe('toBase32', () => {
    const cases = [
      ['', ''],
      ['f', 'my'],
      ['fo', 'mzxq'],
      ['foo', 'mzxw6'],
      ['foob', 'mzxw6yq'],
      ['fooba', 'mzxw6ytb'],
      ['foobar', 'mzxw6ytboi']
    ]
    for (const [input, expected] of cases) {
      it(`encodes "${input}"`, () => {
        assert.strictEqual(toBase32(utf8(input)), expected)
      })
    }
  })

  // https://datatracker.ietf.org/doc/html/draft-msporny-base58-03#section-5
  describe('toBase58btc', () => {
    it('encodes text', () => {
      assert.strictEqual(toBase58btc(utf8('Hello World!')), '2NEpo7TZRRrLZSi2U')
      assert.strictEqual(
        toBase58btc(utf8('The quick brown fox jumps over the lazy dog.')),
        'USm3fpXnKG5EUBx2ndxBDMPVciP5hGey2Jh4NDv6gmeo1LkMeiKrLJUUBk6Z'
      )
    })

    it('encodes leading zeros as 1', () => {
      assert.strictEqual(toBase58btc(fromHex('0000287fb4cd')), '11233QC4')
      assert.strictEqual(toBase58btc(fromHex('00')), '1')
      assert.strictEqual(toBase58btc(fromHex('')), '')
    })
  })

  describe('decodeCid', () => {
    // [description, tag content hex, string]; strings from multiformats@9.9.0 CID#toString()
    const vectors = [
      ['v0', '001220000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', 'QmNLfbof5rLekrACjeuLk9JmGZD2HDBHCU4z16iYKmx5SE'],
      ['v1 raw sha2-256', '000155122000070e151c232a31383f464d545b626970777e858c939aa1a8afb6bdc4cbd2d9', 'bafkreiaaa4hbkhbdfiytqp2gjvkfwytjob3x5bmmsonkdkfpw264js6s3e'],
      ['v1 dag-cbor sha2-256', '0001711220fffefdfcfbfaf9f8f7f6f5f4f3f2f1f0efeeedecebeae9e8e7e6e5e4e3e2e1e0', 'bafyreih77367z6727h4pp5xv6tz7f4pq57xo33hl5lu6rz7g4xsohyxb4a'],
      ['v1 dag-json blake2b-256', '0001a902a0e40220000306090c0f1215181b1e2124272a2d303336393c3f4245484b4e5154575a5d', 'baguqfiheaiqaaaygbega6eqvdanr4ijee4vc2mbtgy4typ2civeewtsrkrlvuxi'],
      ['v1 fil-commitment-unsealed sha2-256-trunc254-padded', '000181e2039220206465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f80818283', 'baga6ea4seaqgizlgm5ugs2tlnrww433qofzhg5dvoz3xq6l2pn6h27t7qcayfay'],
      ['v1 identity', '000155000568656c6c6f', 'bafkqablimvwgy3y'],
      ['v1 identity, empty digest', '0001550000', 'bafkqaaa'],
      ['v1 unregistered codec', '00018180c0011220000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f', 'bagaybqabciqaaaicamcakbqhbaequcymbuha6earcijrifiwc4mbsgq3dqor4hy']
    ]
    for (const [description, hex, string] of vectors) {
      it(`decodes ${description}`, () => {
        assert.strictEqual(decodeCid(fromHex(hex)).string, string)
      })
    }

    it('describes the parts of a v1 CID', () => {
      const cid = decodeCid(fromHex(vectors[4][1]))
      assert.strictEqual(cid.version, 1)
      assert.strictEqual(cid.codec, 0xf101)
      assert.strictEqual(cid.hash, 0x1012)
      assert.strictEqual(cid.digest.length, 32)
      assert.deepEqual(cid.parts, [
        { start: 0, end: 1, label: 'multibase prefix' },
        { start: 1, end: 2, label: 'version(1)' },
        { start: 2, end: 5, label: 'codec(fil-commitment-unsealed)' },
        { start: 5, end: 7, label: 'hash(sha2-256-trunc254-padded)' },
        { start: 7, end: 8, label: 'length(32)' },
        { start: 8, end: 40, label: 'digest' }
      ])
    })

    it('describes the parts of a v0 CID', () => {
      const cid = decodeCid(fromHex(vectors[0][1]))
      assert.strictEqual(cid.version, 0)
      assert.strictEqual(cid.codec, 0x70)
      assert.strictEqual(cid.hash, 0x12)
      assert.deepEqual(cid.parts.map((p) => p.label), ['multibase prefix', 'hash(sha2-256)', 'length(32)', 'digest'])
    })

    it('shows unregistered codes in hex', () => {
      assert.strictEqual(decodeCid(fromHex(vectors[7][1])).parts[2].label, 'codec(0x300001)')
    })

    const invalid = [
      ['empty content', '', /missing 0x00 multibase prefix/],
      ['a missing prefix', '01551220', /missing 0x00 multibase prefix/],
      ['a short v0', `001220${'00'.repeat(31)}`, /CIDv0 must be a 34 byte sha2-256 multihash/],
      ['a long v0', `001220${'00'.repeat(33)}`, /CIDv0 must be a 34 byte sha2-256 multihash/],
      ['a v0 with the wrong digest length', `001221${'00'.repeat(32)}`, /CIDv0 must be a 34 byte sha2-256 multihash/],
      ['an explicit version 0', `0000551220${'00'.repeat(32)}`, /unsupported CID version 0/],
      ['version 2', `0002551220${'00'.repeat(32)}`, /unsupported CID version 2/],
      ['a truncated codec', '000181', /truncated varint/],
      ['a non-minimal codec', `0001d5001220${'00'.repeat(32)}`, /not minimally encoded/],
      ['a missing digest length', '00015512', /truncated varint/],
      ['a short digest', `0001551220${'00'.repeat(31)}`, /digest length 32 does not match the 31 bytes that follow/],
      ['trailing bytes', `0001551220${'00'.repeat(33)}`, /digest length 32 does not match the 33 bytes that follow/]
    ]
    for (const [description, hex, error] of invalid) {
      it(`rejects ${description}`, () => {
        assert.throws(() => decodeCid(fromHex(hex)), error)
      })
    }
  })

  describe('bignum', () => {
    it('reads unsigned bignums', () => {
      assert.strictEqual(bignum(2, fromHex('010000000000000000')), 2n ** 64n)
      assert.strictEqual(bignum(2, fromHex('')), 0n)
    })

    it('reads negative bignums as -1 - n', () => {
      assert.strictEqual(bignum(3, fromHex('010000000000000000')), -1n - 2n ** 64n)
      assert.strictEqual(bignum(3, fromHex('')), -1n)
    })
  })

  describe('epochDate', () => {
    it('converts seconds to an ISO date', () => {
      assert.strictEqual(epochDate(1363896240), '2013-03-21T20:04:00.000Z')
      assert.strictEqual(epochDate(1363896240.5), '2013-03-21T20:04:00.500Z')
      assert.strictEqual(epochDate(-1), '1969-12-31T23:59:59.000Z')
      assert.strictEqual(epochDate(1n), '1970-01-01T00:00:01.000Z')
    })

    it('gives nothing outside the range of a Date', () => {
      assert.strictEqual(epochDate(2 ** 53), undefined)
      assert.strictEqual(epochDate(NaN), undefined)
      assert.strictEqual(epochDate(Infinity), undefined)
    })
  })
})
