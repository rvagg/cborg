const { Token, Type } = require('./token')
const uint = require('./0uint')

function decodeArray (data, pos, minor, options) {
  const lengthDecoded = uint.decode(data, pos, minor, options)
  return new Token(Type.array, lengthDecoded.value, lengthDecoded.encodedLength)
}

function encodeArray (buf, token) {
  const prefixBytes = uint.encode(buf, new Token(Type.uint, token.value))
  buf.set(0, buf.get(0) | Type.array.majorEncoded) // flip major type
  return prefixBytes
}

// using an array as a map key, are you sure about this? we can only sort
// by map length here, it's up to the encoder to decide to look deeper
encodeArray.compareTokens = uint.encode.compareTokens

module.exports.decode = decodeArray
module.exports.encode = encodeArray
