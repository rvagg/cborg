import { Token, Type } from './token.js'
import { encode as uintEncode, decode as uintDecode } from './0uint.js'

function decodeTag (data, pos, minor, options) {
  const numberDecoded = uintDecode(data, pos, minor, options)
  return new Token(Type.tag, numberDecoded.value, numberDecoded.encodedLength)
}

function encodeTag (buf, token) {
  const prefixBytes = uintEncode(buf, new Token(Type.uint, token.value))
  buf.set(0, buf.get(0) | Type.tag.majorEncoded) // flip major type
  return prefixBytes
}

encodeTag.compareTokens = uintEncode.compareTokens

export { decodeTag as decode, encodeTag as encode }
