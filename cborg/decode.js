import { jump, quick, Type } from 'cborg/utils'

/**
 * @typedef {import('cborg/utils').Token} Token
 * @typedef {import('../interface').DecodeOptions} DecodeOptions
 * @typedef {import('../interface').DecodeTokenizer} DecodeTokenizer
 * @typedef {import('../interface').DecodeFunction} DecodeFunction
 */

const /** @type {DecodeOptions} */defaultDecodeOptions = {
  strict: false,
  allowIndefinite: true,
  allowUndefined: true,
  allowBigInt: true,
  decodeErrPrefix: 'CBOR decode error:'
}

/**
 * @implements {DecodeTokenizer}
 */
class Tokeniser {
  /**
   * @param {Uint8Array} data
   * @param {DecodeOptions} options
   */
  constructor (data, options) {
    this._pos = 0
    this.data = data
    this.options = options
    this.jump = jump(options.decodeErrPrefix)
  }

  pos () {
    return this._pos
  }

  done () {
    return this._pos >= this.data.length
  }

  next () {
    const byt = this.data[this._pos]
    let token = quick[byt]
    if (token === undefined) {
      const decoder = this.jump[byt]
      /* c8 ignore next 4 */
      // if we're here then there's something wrong with our jump or quick lists!
      if (!decoder) {
        throw new Error(`${this.options.decodeErrPrefix} no decoder for major type ${byt >>> 5} (byte 0x${byt.toString(16).padStart(2, '0')})`)
      }
      const minor = byt & 31
      token = decoder(this.data, this._pos, minor, this.options)
    }
    // @ts-ignore we get to assume encodedLength is set (crossing fingers slightly)
    this._pos += token.encodedLength
    return token
  }
}

const DONE = Symbol.for('DONE')
const BREAK = Symbol.for('BREAK')

/**
 * @param {Token} token
 * @param {DecodeTokenizer} tokeniser
 * @param {DecodeOptions} options
 * @returns {any|BREAK|DONE}
 */
function tokenToArray (token, tokeniser, options) {
  const arr = []
  for (let i = 0; i < token.value; i++) {
    const value = tokensToObject(tokeniser, options)
    if (value === BREAK) {
      if (token.value === Infinity) {
        // normal end to indefinite length array
        break
      }
      throw new Error(`${options.decodeErrPrefix} got unexpected break to lengthed array`)
    }
    if (value === DONE) {
      throw new Error(`${options.decodeErrPrefix} found array but not enough entries (got ${i}, expected ${token.value})`)
    }
    arr[i] = value
  }
  return arr
}

/**
 * @param {Token} token
 * @param {DecodeTokenizer} tokeniser
 * @param {DecodeOptions} options
 * @returns {any|BREAK|DONE}
 */
function tokenToMap (token, tokeniser, options) {
  const useMaps = options.useMaps === true
  const obj = useMaps ? undefined : {}
  const m = useMaps ? new Map() : undefined
  for (let i = 0; i < token.value; i++) {
    const key = tokensToObject(tokeniser, options)
    if (key === BREAK) {
      if (token.value === Infinity) {
        // normal end to indefinite length map
        break
      }
      throw new Error(`${options.decodeErrPrefix} got unexpected break to lengthed map`)
    }
    if (key === DONE) {
      throw new Error(`${options.decodeErrPrefix} found map but not enough entries (got ${i} [no key], expected ${token.value})`)
    }
    if (useMaps !== true && typeof key !== 'string') {
      throw new Error(`${options.decodeErrPrefix} non-string keys not supported (got ${typeof key})`)
    }
    if (options.rejectDuplicateMapKeys === true) {
      // @ts-ignore
      if ((useMaps && m.has(key)) || (!useMaps && (key in obj))) {
        throw new Error(`${options.decodeErrPrefix} found repeat map key "${key}"`)
      }
    }
    const value = tokensToObject(tokeniser, options)
    if (value === DONE) {
      throw new Error(`${options.decodeErrPrefix} found map but not enough entries (got ${i} [no value], expected ${token.value})`)
    }
    if (useMaps) {
      // @ts-ignore TODO reconsider this .. maybe needs to be strict about key types
      m.set(key, value)
    } else {
      // @ts-ignore TODO reconsider this .. maybe needs to be strict about key types
      obj[key] = value
    }
  }
  // @ts-ignore c'mon man
  return useMaps ? m : obj
}

/**
 * @param {DecodeTokenizer} tokeniser
 * @param {DecodeOptions} options
 * @returns {any|BREAK|DONE}
 */
function tokensToObject (tokeniser, options) {
  // should we support array as an argument?
  // check for tokenIter[Symbol.iterator] and replace tokenIter with what that returns?
  if (tokeniser.done()) {
    return DONE
  }

  const token = tokeniser.next()

  if (token.type.equals(Type.break)) {
    return BREAK
  }

  if (token.type.terminal) {
    return token.value
  }

  if (token.type.equals(Type.array)) {
    return tokenToArray(token, tokeniser, options)
  }

  if (token.type.equals(Type.map)) {
    return tokenToMap(token, tokeniser, options)
  }

  if (token.type.equals(Type.tag)) {
    if (options.tags && typeof options.tags[token.value] === 'function') {
      const tagged = tokensToObject(tokeniser, options)
      return options.tags[token.value](tagged)
    }
    throw new Error(`${options.decodeErrPrefix} tag not supported (${token.value})`)
  }
  /* c8 ignore next */
  throw new Error('unsupported')
}

/**
 * @param {Uint8Array} data
 * @param {DecodeOptions} [options]
 * @returns {[any, Uint8Array]}
 */
function decodeFirst (data, options) {
  options = Object.assign({}, defaultDecodeOptions, options)
  if (!(data instanceof Uint8Array)) {
    throw new Error(`${options.decodeErrPrefix} data to decode must be a Uint8Array`)
  }
  const tokeniser = options.tokenizer || new Tokeniser(data, options)
  const decoded = tokensToObject(tokeniser, options)
  if (decoded === DONE) {
    throw new Error(`${options.decodeErrPrefix} did not find any content to decode`)
  }
  if (decoded === BREAK) {
    throw new Error(`${options.decodeErrPrefix} got unexpected break`)
  }
  return [decoded, data.subarray(tokeniser.pos())]
}

/**
 * @param {Uint8Array} data
 * @param {DecodeOptions} [options]
 * @returns {any}
 */
function decode (data, options) {
  options = Object.assign({}, defaultDecodeOptions, options)
  const [decoded, remainder] = decodeFirst(data, options)
  if (remainder.length > 0) {
    throw new Error(`${options.decodeErrPrefix} too many terminals, data makes no sense:${remainder.length}`)
  }
  return decoded
}

export { Tokeniser, tokensToObject, decode, decodeFirst }
