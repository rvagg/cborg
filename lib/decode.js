import { decodeErrPrefix } from './common.js'
import { Type } from './token.js'
import { decode as uintDecode } from './0uint.js'
import { decode as negintDecode } from './1negint.js'
import { decode as bytesDecode } from './2bytes.js'
import { decode as stringDecode } from './3string.js'
import { decode as arrayDecode } from './4array.js'
import { decode as mapDecode } from './5map.js'
import { decode as mapFloat } from './7float.js'

const decoders = []

decoders[Type.uint.major] = uintDecode
decoders[Type.negint.major] = negintDecode
decoders[Type.bytes.major] = bytesDecode
decoders[Type.string.major] = stringDecode
decoders[Type.array.major] = arrayDecode
decoders[Type.map.major] = mapDecode
decoders[Type.float.major] = mapFloat

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

export { encodedToTokens, tokensToObject, decode }
