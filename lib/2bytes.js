const { assertEnoughData, uintMinorPrefixBytes } = require('./common')
const uint = require('./0uint')

const MAJOR = 2

function decodeBytes (data, pos, minor, options) {
  const length = uint.decode(data, pos, minor, options)
  const pfxBytes = uintMinorPrefixBytes[minor <= 23 ? 23 : minor]
  assertEnoughData(data, pos, pfxBytes + length)
  return data.slice(pos + pfxBytes, pos + pfxBytes + length)
}

function encodeBytes (buf, bytes, major = MAJOR) {
  const prefixBytes = uint.encode(buf, bytes.length)
  buf.set(0, buf.get(0) | major << 5) // flip major type
  buf.copyTo(prefixBytes, bytes)
  return prefixBytes + bytes.length
}

module.exports.MAJOR = MAJOR
module.exports.decode = decodeBytes
module.exports.encode = encodeBytes
