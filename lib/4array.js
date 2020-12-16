import { Token, Type } from './token.js'
import { encode as uintEncode, decode as uintDecode } from './0uint.js'
import { decodeErrPrefix } from './common.js'

// TODO: merge this with map handling, it's the same logic just different type
function decodeArray (data, pos, minor, options) {
  let length
  let encodedLength
  if (minor === 31) {
    // indefinite length
    if (options && options.allowIndefinite === false) {
      throw new Error(`${decodeErrPrefix} indefinite length items not allowed`)
    }
    length = Infinity
    encodedLength = 1
  } else {
    const lengthDecoded = uintDecode(data, pos, minor, options)
    length = lengthDecoded.value
    encodedLength = lengthDecoded.encodedLength
  }
  return new Token(Type.array, length, encodedLength)
}

function encodeArray (buf, token) {
  const prefixBytes = uintEncode(buf, new Token(Type.uint, token.value))
  buf.set(0, buf.get(0) | Type.array.majorEncoded) // flip major type
  return prefixBytes
}

// using an array as a map key, are you sure about this? we can only sort
// by map length here, it's up to the encoder to decide to look deeper
encodeArray.compareTokens = uintEncode.compareTokens

export { decodeArray as decode, encodeArray as encode }
