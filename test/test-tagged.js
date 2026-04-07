/* eslint-env mocha */

import * as chai from 'chai'

import { decode, encode, encodeInto, rfc8949EncodeOptions, Tagged, Token, Type } from '../cborg.js'
import { encodedLength } from '../lib/length.js'
import { fromHex, toHex } from '../lib/byte-utils.js'

const { assert } = chai

describe('Tagged', () => {
  describe('class', () => {
    it('exposes tag and value', () => {
      const t = new Tagged(16, 'hello')
      assert.strictEqual(t.tag, 16)
      assert.strictEqual(t.value, 'hello')
    })

    it('rejects non-integer tag', () => {
      assert.throws(() => new Tagged(1.5, null), TypeError)
      assert.throws(() => new Tagged(-1, null), TypeError)
      // @ts-expect-error - intentional bad input
      assert.throws(() => new Tagged('16', null), TypeError)
      // @ts-expect-error - intentional bad input
      assert.throws(() => new Tagged(undefined, null), TypeError)
      assert.throws(() => new Tagged(NaN, null), TypeError)
    })

    it('Symbol.toStringTag is "Tagged"', () => {
      assert.strictEqual(Object.prototype.toString.call(new Tagged(0, null)), '[object Tagged]')
    })
  })

  describe('encode', () => {
    it('encodes a small tag with primitive value', () => {
      // RFC 8949 example: tag 1 wrapping 1363896240
      const bytes = encode(new Tagged(1, 1363896240))
      assert.strictEqual(toHex(bytes), 'c11a514b67b0')
    })

    it('encodes a 1-byte tag header (>= 24)', () => {
      const bytes = encode(new Tagged(32, 'http://example.com'))
      assert.strictEqual(bytes[0], 0xd8)
      assert.strictEqual(bytes[1], 32)
    })

    it('encodes a 2-byte tag header (>= 256)', () => {
      const bytes = encode(new Tagged(259, new Map()))
      // d9 01 03 = tag(259), then a0 = map(0)
      assert.strictEqual(toHex(bytes), 'd90103a0')
    })

    it('encodes a 4-byte tag header (>= 65536)', () => {
      const bytes = encode(new Tagged(0x10000, 0))
      // da 00 01 00 00 = tag(65536), then 00 = uint(0)
      assert.strictEqual(toHex(bytes), 'da0001000000')
    })

    it('recurses into nested object value', () => {
      const bytes = encode(new Tagged(16, [new Uint8Array([1, 2, 3]), new Map(), null]))
      const decoded = decode(bytes, { tags: Tagged.preserve(16), useMaps: true })
      assert.instanceOf(decoded, Tagged)
      assert.strictEqual(decoded.tag, 16)
      assert.deepEqual(decoded.value[0], new Uint8Array([1, 2, 3]))
      assert.instanceOf(decoded.value[1], Map)
      assert.strictEqual(decoded.value[2], null)
    })

    it('Tagged is overridable via typeEncoders (returning null falls through)', () => {
      // Override that only special-cases tag 99 and falls through for everything else
      let calls = 0
      const bytes = encode(new Tagged(99, 'ignored'), {
        typeEncoders: {
          Tagged: (obj) => {
            calls++
            if (obj.tag !== 999) return null // fall through
            return [new Token(Type.string, 'replaced')]
          }
        }
      })
      assert.strictEqual(calls, 1)
      // Falling through means default behaviour: tag(99) text("ignored")
      const decoded = decode(bytes, { tags: Tagged.preserve(99) })
      assert.strictEqual(decoded.tag, 99)
      assert.strictEqual(decoded.value, 'ignored')
    })

    it('Tagged is overridable via typeEncoders (full replacement)', () => {
      const bytes = encode(new Tagged(99, 'foo'), {
        typeEncoders: {
          Tagged: () => [new Token(Type.string, 'replaced')]
        }
      })
      assert.strictEqual(decode(bytes), 'replaced')
    })

    it('typeEncoders for inner types apply to wrapped value', () => {
      // Custom Date encoder should fire when Date appears inside Tagged.value
      let dateEncoderCalled = false
      const bytes = encode(new Tagged(16, [new Date(0)]), {
        typeEncoders: {
          Date: (d) => {
            dateEncoderCalled = true
            return [new Token(Type.uint, d.getTime())]
          }
        }
      })
      assert.isTrue(dateEncoderCalled)
      const decoded = decode(bytes, { tags: Tagged.preserve(16) })
      assert.strictEqual(decoded.tag, 16)
      assert.deepEqual(decoded.value, [0])
    })

    it('rfc8949EncodeOptions sorts maps inside Tagged.value', () => {
      // Build a Map whose insertion order differs from RFC 8949 bytewise order.
      // RFC 8949 sorts keys by their canonical encoding bytes; for short
      // strings the longer key sorts later.
      const inner = new Map([
        ['bb', 2],
        ['a', 1]
      ])
      const sortedDefault = encode(new Tagged(16, inner))
      const sortedRfc8949 = encode(new Tagged(16, inner), rfc8949EncodeOptions)

      // Default (RFC 7049, length-first) and RFC 8949 (bytewise) agree here:
      // 'a' (1 byte) sorts before 'bb' (2 bytes) under both rules.
      assert.deepEqual(sortedDefault, sortedRfc8949)

      // Verify the tag header is present and the inner map is sorted
      const decodedDefault = decode(sortedDefault, { tags: Tagged.preserve(16), useMaps: true })
      assert.strictEqual(decodedDefault.tag, 16)
      assert.instanceOf(decodedDefault.value, Map)
      assert.deepEqual([...decodedDefault.value.keys()], ['a', 'bb'])
    })

    it('detects circular references inside Tagged.value', () => {
      const arr = []
      arr.push(arr)
      assert.throws(() => encode(new Tagged(16, arr)), /circular/i)
    })

    it('works with encodeInto', () => {
      const dest = new Uint8Array(64)
      const { written } = encodeInto(new Tagged(1, 1363896240), dest)
      assert.strictEqual(toHex(dest.subarray(0, written)), 'c11a514b67b0')
    })

    it('works with encodedLength', () => {
      const value = new Tagged(16, [new Uint8Array([1, 2, 3]), new Map([[1, 2]]), null])
      const expected = encode(value).length
      assert.strictEqual(encodedLength(value), expected)
    })
  })

  describe('decode', () => {
    it('Tagged.decoder builds a passthrough decoder', () => {
      const bytes = fromHex('c11a514b67b0') // tag(1) 1363896240
      const value = decode(bytes, { tags: { 1: Tagged.decoder(1) } })
      assert.instanceOf(value, Tagged)
      assert.strictEqual(value.tag, 1)
      assert.strictEqual(value.value, 1363896240)
    })

    it('Tagged.preserve builds a tags map for multiple tags', () => {
      const tags = Tagged.preserve(16, 96)
      assert.typeOf(tags[16], 'function')
      assert.typeOf(tags[96], 'function')
      assert.isUndefined(tags[1])
    })

    it('Tagged.preserve with no arguments yields an empty tags map', () => {
      const tags = Tagged.preserve()
      assert.deepEqual(Object.keys(tags), [])
    })

    it('unregistered tags still throw when Tagged.preserve is partial', () => {
      // tag(2) wrapping bytes(0)
      const bytes = fromHex('c240')
      assert.throws(() => decode(bytes, { tags: Tagged.preserve(16) }), /tag not supported/)
    })
  })

  describe('round-trip', () => {
    it('round-trips a COSE_Encrypt0-shaped envelope', () => {
      // Build a structure resembling COSE_Encrypt0 (RFC 9052):
      //   tag(16) [protected_bstr, unprotected_map, ciphertext_or_nil]
      const protectedHeaders = encode(new Map([[1, -7]])) // alg = ES256
      const unprotected = new Map([[5, new Uint8Array([0xaa, 0xbb])]]) // iv
      const envelope = new Tagged(16, [protectedHeaders, unprotected, null])

      const bytes = encode(envelope)
      const decoded = decode(bytes, { tags: Tagged.preserve(16), useMaps: true })

      assert.instanceOf(decoded, Tagged)
      assert.strictEqual(decoded.tag, 16)
      assert.deepEqual(decoded.value[0], protectedHeaders)
      assert.instanceOf(decoded.value[1], Map)
      assert.deepEqual(decoded.value[1].get(5), new Uint8Array([0xaa, 0xbb]))
      assert.strictEqual(decoded.value[2], null)
    })

    it('round-trips deeply nested Tagged instances', () => {
      let v = /** @type {any} */ ('leaf')
      for (let i = 1; i <= 5; i++) {
        v = new Tagged(i, v)
      }
      const bytes = encode(v)
      const decoded = decode(bytes, { tags: Tagged.preserve(1, 2, 3, 4, 5) })
      let cur = decoded
      for (let i = 5; i >= 1; i--) {
        assert.instanceOf(cur, Tagged)
        assert.strictEqual(cur.tag, i)
        cur = cur.value
      }
      assert.strictEqual(cur, 'leaf')
    })

    it('Tagged round-trips through rfc8949EncodeOptions', () => {
      const value = new Tagged(16, [
        new Tagged(2, new Uint8Array([0xff])),
        new Map([['z', 1], ['a', 2]])
      ])
      const bytes = encode(value, rfc8949EncodeOptions)
      const decoded = decode(bytes, { tags: Tagged.preserve(2, 16), useMaps: true })
      assert.strictEqual(decoded.tag, 16)
      assert.strictEqual(decoded.value[0].tag, 2)
      assert.deepEqual(decoded.value[0].value, new Uint8Array([0xff]))
      assert.deepEqual([...decoded.value[1].keys()], ['a', 'z'])
    })
  })
})
