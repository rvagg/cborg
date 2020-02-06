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
  // `encodedBytes` allows for caching when we do a byte version of a string
  // for key sorting purposes
  let bytes = token.encodedBytes
  if (bytes === undefined) {
    bytes = token.value
  }
  const length = typeof bytes === 'string' ? Buffer.byteLength(bytes) : bytes.length
  const prefixBytes = uint.encode(buf, new Token(Type.uint, length))
  buf.set(0, buf.get(0) | token.type.majorEncoded) // flip major type
  buf.copyTo(prefixBytes, bytes, length) // copyTo can handle a `string` or `Buffer`
  return prefixBytes + length
}

encodeBytes.compareTokens = function compareTokens (tok1, tok2) {
  if (tok1.type !== Type.bytes || tok2.type !== Type.bytes) {
    throw new Error('Unexpected comparison')
  }

  return compareBytes(tok1.value, tok2.value)
}

function compareBytes (b1, b2) {
  if (b1.byteLength < b2.byteLength) {
    return -1
  }

  if (b1.byteLength > b2.byteLength) {
    return 1
  }

  return b1.compare(b2)
}

module.exports.decode = decodeBytes
module.exports.encode = encodeBytes
module.exports.compareBytes = compareBytes
