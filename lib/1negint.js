/* eslint-env es2020 */

import { Token, Type } from './token.js'
import { encode as uintEncode, decode as uintDecode } from './0uint.js'

const neg1b = BigInt(-1)
const pos1b = BigInt(1)

function decodeNegint (data, pos, minor, options) {
  const decodedUint = uintDecode(data, pos, minor, options) // decode uint
  if (typeof decodedUint.value === 'bigint') {
    return new Token(Type.negint, neg1b - decodedUint.value, decodedUint.encodedLength)
  }
  const value = -1 - decodedUint.value
  return new Token(Type.negint, Number.isSafeInteger(value) ? value : BigInt(value), decodedUint.encodedLength)
}

function encodeNegint (buf, token) {
  const negint = token.value

  const unsigned = (typeof negint === 'bigint' ? (negint * neg1b - pos1b) : (negint * -1 - 1))
  const bytes = uintEncode(buf, new Token(Type.uint, unsigned))
  buf.set(0, buf.get(0) | token.type.majorEncoded) // flip major type
  return bytes
}

encodeNegint.compareTokens = function compareTokens (tok1, tok2) {
  // opposite of the uint comparison since we store the uint version in bytes
  return tok1.value < tok2.value ? 1 : tok1.value > tok2.value ? -1 : /* c8 ignore next */ 0
}

export { decodeNegint as decode, encodeNegint as encode }
