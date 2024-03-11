/*
RFC 8746 defines a set of tags to use for typed arrays. Out of the box, cborg doesn't care about
tags and just squashes all concerns around byte arrays to Uint8Array with major type 2. This is
fine for most use cases, but it is lossy, you can't round-trip and retain your original type.

This example shows how to use cborg to round-trip a typed array with tags.

https://www.rfc-editor.org/rfc/rfc8746.html
*/

import { encode, decode, Token, Tokenizer, Type } from 'cborg.js'

const tagUint8Array = 64
const tagUint64Array = 71
// etc... see https://www.rfc-editor.org/rfc/rfc8746.html#name-iana-considerations

/* ENCODERS */

/**
 * @param {any} obj
 * @returns {[Token]}
 */
function uint8ArrayEncoder (obj) {
  if (!(obj instanceof Uint8Array)) {
    throw new Error('expected Uint8Array')
  }
  return [
    new Token(Type.tag, tagUint8Array),
    new Token(Type.bytes, obj)
  ]
}

/**
 * @param {any} obj
 * @returns {[Token]}
 */
function uint64ArrayEncoder (obj) {
  if (!(obj instanceof BigUint64Array)) {
    throw new Error('expected BigUint64Array')
  }
  return [
    new Token(Type.tag, tagUint64Array),
    // BigUint64Array to a Uint8Array, but we have to pay attention to the possibility of it being
    // a view of a larger ArrayBuffer.
    new Token(Type.bytes, new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength))
  ]
}

// etc...

const typeEncoders = {
  Uint8Array: uint8ArrayEncoder,
  BigUint64Array: uint64ArrayEncoder
}

/* DECODERS */

/**
 * @param {ArrayBuffer} bytes
 * @returns {any}
 */
function uint8ArrayDecoder (bytes) {
  if (!(bytes instanceof ArrayBuffer)) {
    throw new Error('expected ArrayBuffer')
  }
  return new Uint8Array(bytes)
}

/**
 * @param {ArrayBuffer} bytes
 * @returns {any}
 */
function uint64ArrayDecoder (bytes) {
  if (!(bytes instanceof ArrayBuffer)) {
    throw new Error('expected ArrayBuffer')
  }
  return new BigUint64Array(bytes)
}

// etc...

const tags = []
tags[tagUint8Array] = uint8ArrayDecoder
tags[tagUint64Array] = uint64ArrayDecoder

/* TOKENIZER */

// We have to deal with the fact that cborg talks in Uint8Arrays but we now want it to treat major 2
// as ArrayBuffers, so we have to transform the token stream to replace the Uint8Array with an
// ArrayBuffer.

class ArrayBufferTransformingTokeniser extends Tokenizer {
  next () {
    const nextToken = super.next()
    if (nextToken.type === Type.bytes) {
      // Transform the (assumed) Uint8Array value to an ArrayBuffer of the same bytes, note though
      // that all tags we care about are going to be <tag><bytes>, so we're also transforming those
      // into ArrayBuffers, so our tag decoders need to also assume they are getting ArrayBuffers
      // now. An alternative would be to watch the token stream for <tag> and not transform the next
      // token if it's <bytes>, but that's a bit more complicated for demo purposes.
      nextToken.value = nextToken.value.buffer
    }
    return nextToken
  }
}

// Optional: a new decode() wrapper, mainly so we don't have to deal with the complications of\
// instantiating a Tokenizer which needs both data and the options.
function byteStringDecoder (data, options) {
  options = Object.assign({}, options, {
    tags,
    tokenizer: new ArrayBufferTransformingTokeniser(data, options)
  })
  return decode(data, options)
}

/* ROUND-TRIP */

const original = {
  u8: new Uint8Array([1, 2, 3, 4, 5]),
  u64: new BigUint64Array([10000000000000000n, 20000000000000000n, 30000000000000000n, 40000000000000000n, 50000000000000000n]),
  ab: new Uint8Array([6, 7, 8, 9, 10]).buffer
}

const encoded = encode(original, { typeEncoders })

const decoded = byteStringDecoder(encoded)

console.log('Original:', original)
console.log('Encoded:', Buffer.from(encoded).toString('hex')) // excuse the Buffer, sorry browser peeps
console.log('Decoded:', decoded)

/* Output:

Original: {
  u8: Uint8Array(5) [ 1, 2, 3, 4, 5 ],
  u64: BigUint64Array(5) [
    10000000000000000n,
    20000000000000000n,
    30000000000000000n,
    40000000000000000n,
    50000000000000000n
  ],
  ab: ArrayBuffer { [Uint8Contents]: <06 07 08 09 0a>, byteLength: 5 }
}
Encoded: a362616245060708090a627538d84045010203040563753634d84758280000c16ff2862300000082dfe40d47000000434fd7946a00000004bfc91b8e000000c52ebca2b100
Decoded: {
  ab: ArrayBuffer { [Uint8Contents]: <06 07 08 09 0a>, byteLength: 5 },
  u8: Uint8Array(5) [ 1, 2, 3, 4, 5 ],
  u64: BigUint64Array(5) [
    10000000000000000n,
    20000000000000000n,
    30000000000000000n,
    40000000000000000n,
    50000000000000000n
  ]
}

*/

/* Diagnostic:

$ cborg hex2diag a362616245060708090a627538d84045010203040563753634d84758280000c16ff2862300000082dfe40d47000000434fd7946a00000004bfc91b8e000000c52ebca2b100
a3                                                # map(3)
  62                                              #   string(2)
    6162                                          #     "ab"
  45                                              #   bytes(5)
    060708090a                                    #     "\x06\x07\x08\x09\x0a"
  62                                              #   string(2)
    7538                                          #     "u8"
  d8 40                                           #   tag(64)
    45                                            #     bytes(5)
      0102030405                                  #       "\x01\x02\x03\x04\x05"
  63                                              #   string(3)
    753634                                        #     "u64"
  d8 47                                           #   tag(71)
    58 28                                         #     bytes(40)
      0000c16ff2862300000082dfe40d47000000434fd7  #       "\x00\x00Áoò\x86#\x00\x00\x00\x82ßä\x0dG\x00\x00\x00CO×"
      946a00000004bfc91b8e000000c52ebca2b100      #       "\x94j\x00\x00\x00\x04¿É\x1b\x8e\x00\x00\x00Å.¼¢±\x00
*/
