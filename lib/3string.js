const bytes = require('./2bytes')

const MAJOR = 3

function encodeString (dest, str) {
  return bytes.encode(dest, Buffer.from(str), MAJOR)
}

function decodeString (data, pos, minor, options) {
  return Buffer.from(bytes.decode(data, pos, minor, options)).toString('utf8')
}

module.exports.MAJOR = MAJOR
module.exports.decode = decodeString
module.exports.encode = encodeString
