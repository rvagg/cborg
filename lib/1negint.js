import { Token, Type } from './token.js'
import { encodeErrPrefix } from './common.js'
import { encode as uintEncode, decode as uintDecode } from './0uint.js'

function decodeNegint (data, pos, minor, options) {
  const decodedUint = uintDecode(data, pos, minor, options) // decode uint
  return new Token(Type.negint, -1 - decodedUint.value, decodedUint.encodedLength)
}

function encodeNegint (buf, token) {
  const negint = token.value

  if (negint < Number.MIN_SAFE_INTEGER) { // we could go one lower but it's hard to assert
    throw new Error(`${encodeErrPrefix} number too large to encode (${negint})`)
  }
  const unsigned = negint * -1 - 1
  const bytes = uintEncode(buf, new Token(Type.uint, unsigned))
  buf.set(0, buf.get(0) | token.type.majorEncoded) // flip major type
  return bytes
}

encodeNegint.compareTokens = function compareTokens (tok1, tok2) {
  // opposite of the uint comparison since we store the uint version in bytes
  return tok1.value < tok2.value ? 1 : tok1.value > tok2.value ? -1 : 0
}

export { decodeNegint as decode, encodeNegint as encode }
