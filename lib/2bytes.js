const { Token, Type } = require('./token')
const { assertEnoughData, uintMinorPrefixBytes } = require('./common')
const uint = require('./0uint')

function decodeBytes (data, pos, minor, options) {
  const lengthDecoded = uint.decode(data, pos, minor, options)
  const pfxBytes = uintMinorPrefixBytes[minor <= 23 ? 23 : minor]
  assertEnoughData(data, pos, pfxBytes + lengthDecoded.value)
  const buf = data.slice(pos + pfxBytes, pos + pfxBytes + lengthDecoded.value)
  return new Token(Type.bytes, buf, lengthDecoded.encodedLength + lengthDecoded.value)
}

function encodeBytes (buf, token) {
  const bytes = Buffer.isBuffer(token.value) ? token.value : Buffer.from(token.value) // could be string
  const prefixBytes = uint.encode(buf, new Token(Type.uint, bytes.length))
  buf.set(0, buf.get(0) | token.type.majorEncoded) // flip major type
  buf.copyTo(prefixBytes, bytes)
  return prefixBytes + bytes.length
}

module.exports.decode = decodeBytes
module.exports.encode = encodeBytes
