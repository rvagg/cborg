const { decodeErrPrefix } = require('./common')
const { Type } = require('./token')
const uint = require('./0uint')
const negint = require('./1negint')
const bytes = require('./2bytes')
const string = require('./3string')

const decoders = []

decoders[Type.uint.major] = uint.decode
decoders[Type.negint.major] = negint.decode
decoders[Type.bytes.major] = bytes.decode
decoders[Type.string.major] = string.decode

const defaultDecodeOptions = {
  strict: false
}

function * encodedToTokens (data, options) {
  const pos = 0

  const major = data[0] >>> 5
  const minor = data[0] & 31

  const decoder = decoders[major]
  if (!decoder) {
    throw new Error(`${decodeErrPrefix} no decoder for major type ${major}`)
  }

  yield decoder(data, pos, minor, options)
}

const DONE = Symbol.for('DONE')

function tokensToObject (tokenIter) {
  // should we support arrays?
  // check for tokenIter[Symbol.iterator] and replace tokenIter with what that returns?
  const next = tokenIter.next()
  if (next.done) {
    return DONE
  }
  const token = next.value
  if (token.type.terminal) {
    return token.value
  }
  if (token.type === Type.array) {
    const arr = []
    for (let i = 0; i < token.value; i++) {
      const value = tokensToObject(tokenIter)
      if (value === DONE) {
        throw new Error(`${decodeErrPrefix} found array but not enough entries`)
      }
      arr[i] = value
    }
    return arr
  }
  throw new Error('unsupported')
}

function decode (data, options) {
  options = Object.assign({}, defaultDecodeOptions, options)
  const tokenIter = encodedToTokens(data, options)
  const decoded = tokensToObject(tokenIter)
  if (decoded === DONE) {
    throw new Error(`${decodeErrPrefix} did not find any content to decode`)
  }
  if (!tokenIter.next().done) {
    throw new Error(`${decodeErrPrefix} too many terminals, data makes no sense`)
  }
  return decoded
}

module.exports.encodedToTokens = encodedToTokens
module.exports.tokensToObject = tokensToObject
module.exports.decode = decode
