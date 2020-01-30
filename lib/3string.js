const { Token, Type } = require('./token')
const bytes = require('./2bytes')

function decodeString (data, pos, minor, options) {
  const decodedBytes = bytes.decode(data, pos, minor, options)
  return new Token(Type.string, Buffer.from(decodedBytes.value).toString('utf8'))
}

module.exports.decode = decodeString
module.exports.encode = bytes.encode
