const { decodeErrPrefix } = require('./common')
const { Type } = require('./token')
const uint = require('./0uint')
const negint = require('./1negint')
const bytes = require('./2bytes')
const string = require('./3string')
const array = require('./4array')
const map = require('./5map')

const decoders = []

decoders[Type.uint.major] = uint.decode
decoders[Type.negint.major] = negint.decode
decoders[Type.bytes.major] = bytes.decode
decoders[Type.string.major] = string.decode
decoders[Type.array.major] = array.decode
decoders[Type.map.major] = map.decode

const defaultDecodeOptions = {
  strict: false
}

function * encodedToTokens (data, options) {
  let pos = 0

  while (pos < data.length) {
    const major = data[pos] >>> 5
    const minor = data[pos] & 31

    const decoder = decoders[major]
    if (!decoder) {
      throw new Error(`${decodeErrPrefix} no decoder for major type ${major}`)
    }

    const token = decoder(data, pos, minor, options)
    yield token
    pos += token.encodedLength
  }
}

const DONE = Symbol.for('DONE')

function tokensToObject (tokenIter, options) {
  // should we support array as an argument?
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
      const value = tokensToObject(tokenIter, options)
      if (value === DONE) {
        throw new Error(`${decodeErrPrefix} found array but not enough entries (got ${i}, expected ${token.value})`)
      }
      arr[i] = value
    }
    return arr
  }

  if (token.type === Type.map) {
    const obj = options.useMaps !== true ? Object.create(null) : undefined
    const m = options.useMaps === true ? new Map() : undefined
    for (let i = 0; i < token.value; i++) {
      const key = tokensToObject(tokenIter, options)
      if (key === DONE) {
        throw new Error(`${decodeErrPrefix} found map but not enough entries (got ${i} [no key], expected ${token.value})`)
      }
      const value = tokensToObject(tokenIter, options)
      if (value === DONE) {
        throw new Error(`${decodeErrPrefix} found map but not enough entries (got ${i} [no value], expected ${token.value})`)
      }
      if (obj) {
        obj[key] = value
      } else {
        m.set(key, value)
      }
    }
    return obj || m
  }

  throw new Error('unsupported')
}

function decode (data, options) {
  options = Object.assign({}, defaultDecodeOptions, options)
  const tokenIter = encodedToTokens(data, options)
  const decoded = tokensToObject(tokenIter, options)
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
