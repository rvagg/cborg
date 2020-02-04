const { Token, Type } = require('./token')
const bytes = require('./2bytes')

function decodeString (data, pos, minor, options) {
  const decodedBytes = bytes.decode(data, pos, minor, options)
  const str = Buffer.from(decodedBytes.value).toString('utf8')
  return new Token(Type.string, str, decodedBytes.encodedLength)
}

function encodeString (buf, token) {
  return bytes.encode(buf, token)
}

encodeString.compareTokens = function compareTokens (tok1, tok2) {
  if (tok1.type !== Type.string || tok2.type !== Type.string) {
    throw new Error('Unexpected comparison')
  }

  // Buffer.from(str) means we have lots of small allocations that we end up
  // shuffling around. Perhaps it'll be more performant to write them out onto
  // a pre-allocated chunk? Need to test this.
  if (tok1.encodedBytes === undefined) {
    tok1.encodedBytes = Buffer.from(tok1.value, 'utf8')
  }
  if (tok2.encodedBytes === undefined) {
    tok2.encodedBytes = Buffer.from(tok2.value, 'utf8')
  }

  return bytes.compareBytes(tok1.encodedBytes, tok2.encodedBytes)
}

module.exports.decode = decodeString
module.exports.encode = encodeString
