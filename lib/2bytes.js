import { Token, Type } from './token.js'
import { assertEnoughData, decodeErrPrefix, uintMinorPrefixBytes } from './common.js'
import { encode as uintEncode, decode as uintDecode } from './0uint.js'

const textEncoder = new TextEncoder()

function decodeBytes (data, pos, minor, options) {
  if (minor === 31) {
    throw new Error(`${decodeErrPrefix} indefinite length bytes not supported`)
  }
  const lengthDecoded = uintDecode(data, pos, minor, options)
  const pfxBytes = uintMinorPrefixBytes[minor <= 23 ? 23 : minor]
  assertEnoughData(data, pos, pfxBytes + lengthDecoded.value)
  const buf = data.slice(pos + pfxBytes, pos + pfxBytes + lengthDecoded.value)
  return new Token(Type.bytes, buf, lengthDecoded.encodedLength + lengthDecoded.value)
}

function encodeBytes (buf, token) {
  // `encodedBytes` allows for caching when we do a byte version of a string
  // for key sorting purposes
  let bytes = token.encodedBytes
  if (bytes === undefined) {
    bytes = token.value
  }
  const length = typeof bytes === 'string' ? textEncoder.encode(bytes).length : bytes.length
  const prefixBytes = uintEncode(buf, new Token(Type.uint, length))
  buf.set(0, buf.get(0) | token.type.majorEncoded) // flip major type
  buf.copyTo(prefixBytes, bytes, length) // copyTo can handle a `string` or `Uint8Array`
  return prefixBytes + length
}

encodeBytes.compareTokens = function compareTokens (tok1, tok2) {
  return compareBytes(tok1.value, tok2.value)
}

function compareBytes (b1, b2) {
  if (b1.length < b2.length) {
    return -1
  }

  if (b1.length > b2.length) {
    return 1
  }

  for (let i = 0; i < b1.length; i++) {
    if (b1[i] === b2[i]) {
      continue
    }
    return b1[i] < b2[i] ? -1 : 1
  } /* c8 ignore next 3 */

  return 0
}

export { decodeBytes as decode, encodeBytes as encode, compareBytes }
