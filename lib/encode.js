const { Token, Type } = require('./token')
const bl = require('./bl')

const uint = require('./0uint')
const negint = require('./1negint')
const bytes = require('./2bytes')
const string = require('./3string')

const encoders = []
encoders[Type.uint.major] = uint.encode
encoders[Type.negint.major] = negint.encode
encoders[Type.bytes.major] = bytes.encode
encoders[Type.string.major] = string.encode

function * objectToTokens (obj) {
  if (typeof obj === 'number') {
    if (obj >= 0) {
      yield new Token(Type.uint, obj)
    } else {
      yield new Token(Type.negint, obj)
    }
  } else if (Buffer.isBuffer(obj) || obj instanceof Uint8Array) { // TODO other array buffers?
    yield new Token(Type.bytes, obj)
  } else if (typeof obj === 'string') {
    yield new Token(Type.string, obj)
  } else if (Array.isArray(obj)) {
    yield new Token(Type.array, obj.length)
    for (let i = 0; i < obj.length; i++) {
      yield * objectToTokens(obj[i])
    }
  } else {
    throw new Error('unsupported')
  }
}

function tokensToEncoded (buf, tokens) {
  for (const token of tokens) {
    const length = encoders[token.type.major](buf, token)
    buf.inc(length)
  }
}

function encode (data) {
  const buf = bl(1024)
  tokensToEncoded(buf, objectToTokens(data))
  return buf.toBuffer()
}

module.exports.objectToTokens = objectToTokens
module.exports.tokensToEncoded = tokensToEncoded
module.exports.encode = encode
