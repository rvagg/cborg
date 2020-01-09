const { encodeErrPrefix } = require('./common')
const uint = require('./0uint')

const MAJOR = 1

function decodeNegint (data, pos, minor, options) {
  const unsigned = uint.decode(data, pos, minor, options) // decode uint
  return -1 - unsigned
}

function encodeNegint (buf, negint) {
  if (negint < Number.MIN_SAFE_INTEGER) { // we could go one lower but it's hard to assert
    throw new Error(`${encodeErrPrefix} number too large to encode (${negint})`)
  }
  const unsigned = negint * -1 - 1
  const bytes = uint.encode(buf, unsigned)
  buf.set(0, buf.get(0) | MAJOR << 5) // flip major type
  return bytes
}

module.exports.MAJOR = MAJOR
module.exports.decode = decodeNegint
module.exports.encode = encodeNegint
