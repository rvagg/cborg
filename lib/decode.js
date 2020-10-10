import { decodeErrPrefix } from './common.js'
import { Type } from './token.js'
import { decode as uintDecode } from './0uint.js'
import { decode as negintDecode } from './1negint.js'
import { decode as bytesDecode } from './2bytes.js'
import { decode as stringDecode } from './3string.js'
import { decode as arrayDecode } from './4array.js'
import { decode as mapDecode } from './5map.js'
import { decode as tagDecode } from './6tag.js'
import { decode as floatDecode } from './7float.js'

const decoders = []

decoders[Type.uint.major] = uintDecode
decoders[Type.negint.major] = negintDecode
decoders[Type.bytes.major] = bytesDecode
decoders[Type.string.major] = stringDecode
decoders[Type.array.major] = arrayDecode
decoders[Type.map.major] = mapDecode
decoders[Type.tag.major] = tagDecode
decoders[Type.float.major] = floatDecode

const defaultDecodeOptions = {
  strict: false
}

function * encodedToTokens (data, options = {}) {
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
const BREAK = Symbol.for('BREAK')

function tokensToObject (tokenIter, options) {
  // should we support array as an argument?
  // check for tokenIter[Symbol.iterator] and replace tokenIter with what that returns?
  const next = tokenIter.next()
  if (next.done) {
    return DONE
  }

  const token = next.value

  if (token.type === Type.break) {
    return BREAK
  }

  if (token.type.terminal) {
    return token.value
  }

  if (token.type === Type.array) {
    const arr = []
    for (let i = 0; i < token.value; i++) {
      const value = tokensToObject(tokenIter, options)
      if (value === BREAK) {
        if (token.value === Infinity) {
          // normal end to indefinite length array
          break
        }
        throw new Error(`${decodeErrPrefix} got unexpected break to lengthed array`)
      }
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
      if (key === BREAK) {
        if (token.value === Infinity) {
          // normal end to indefinite length array
          break
        }
        throw new Error(`${decodeErrPrefix} got unexpected break to lengthed map`)
      }
      if (options.useMaps !== true && typeof key !== 'string') {
        throw new Error(`${decodeErrPrefix} non-string keys not supported (got ${typeof key})`)
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

  if (token.type === Type.tag) {
    if (options.tags && typeof options.tags[token.value] === 'function') {
      const tagged = tokensToObject(tokenIter, options)
      return options.tags[token.value](tagged)
    }
    throw new Error(`${decodeErrPrefix} tag not supported (${token.value})`)
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
  if (decoded === BREAK) {
    throw new Error(`${decodeErrPrefix} got unexpected break`)
  }
  if (!tokenIter.next().done) {
    throw new Error(`${decodeErrPrefix} too many terminals, data makes no sense`)
  }
  return decoded
}

export { encodedToTokens, tokensToObject, decode }
