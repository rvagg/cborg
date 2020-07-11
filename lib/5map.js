import { Token, Type } from './token.js'
import { encode as uintEncode, decode as uintDecode } from './0uint.js'

function decodeMap (data, pos, minor, options) {
  const lengthDecoded = uintDecode(data, pos, minor, options)
  return new Token(Type.map, lengthDecoded.value, lengthDecoded.encodedLength)
}

function encodeMap (buf, token) {
  const prefixBytes = uintEncode(buf, new Token(Type.uint, token.value))
  buf.set(0, buf.get(0) | Type.map.majorEncoded) // flip major type
  return prefixBytes
}

// using a map as a map key, are you sure about this? we can only sort
// by map length here, it's up to the encoder to decide to look deeper
encodeMap.compareTokens = uintEncode.compareTokens

export { decodeMap as decode, encodeMap as encode }
