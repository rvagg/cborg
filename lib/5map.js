const { Token, Type } = require('./token')
const uint = require('./0uint')

function decodeMap (data, pos, minor, options) {
  const lengthDecoded = uint.decode(data, pos, minor, options)
  return new Token(Type.map, lengthDecoded.value, lengthDecoded.encodedLength)
}

function encodeMap (buf, token) {
  const prefixBytes = uint.encode(buf, new Token(Type.uint, token.value))
  buf.set(0, buf.get(0) | Type.map.majorEncoded) // flip major type
  return prefixBytes
}

// using a map as a map key, are you sure about this? we can only sort
// by map length here, it's up to the encoder to decide to look deeper
encodeMap.compareTokens = uint.encode.compareTokens

module.exports.decode = decodeMap
module.exports.encode = encodeMap
