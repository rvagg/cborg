const { Token, Type } = require('./token')
const { encodeErrPrefix } = require('./common')
const uint = require('./0uint')

function decodeNegint (data, pos, minor, options) {
  const decodedUint = uint.decode(data, pos, minor, options) // decode uint
  return new Token(Type.negint, -1 - decodedUint.value)
}

function encodeNegint (buf, token) {
  const negint = token.value

  if (negint < Number.MIN_SAFE_INTEGER) { // we could go one lower but it's hard to assert
    throw new Error(`${encodeErrPrefix} number too large to encode (${negint})`)
  }
  const unsigned = negint * -1 - 1
  const bytes = uint.encode(buf, new Token(Type.uint, unsigned))
  buf.set(0, buf.get(0) | token.type.majorEncoded) // flip major type
  return bytes
}

module.exports.decode = decodeNegint
module.exports.encode = encodeNegint
