import { Token, Type } from './token.js'
import { assertEnoughData, decodeErrPrefix } from './common.js'
import * as uint from './0uint.js'
import { encodeBytes } from './2bytes.js'

// ignoreBOM: true means the decoder doesn't strip a leading U+FEFF so we
// can get a faithful round-trip
const textDecoder = new TextDecoder('utf-8', { ignoreBOM: true })

// Throws a TypeError on invalid UTF-8
const fatalDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true })

// Threshold for ASCII fast-path vs TextDecoder. Short ASCII strings (common for
// map keys) are faster to decode with a simple loop than TextDecoder overhead.
const ASCII_THRESHOLD = 32

/**
 * @typedef {import('../interface.js').ByteWriter} ByteWriter
 * @typedef {import('../interface.js').DecodeOptions} DecodeOptions
 */

/**
 * Decode UTF-8 bytes to string. For short ASCII strings (common case for map keys),
 * a simple loop is faster than TextDecoder.
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} end
 * @param {DecodeOptions} options
 * @returns {string}
 */
function toStr (bytes, start, end, options) {
  const len = end - start
  if (len < ASCII_THRESHOLD) {
    let str = ''
    for (let i = start; i < end; i++) {
      const c = bytes[i]
      if (c & 0x80) { // non-ASCII, fall back to TextDecoder
        return options.strictUtf8 === true ? decodeStrict(bytes, start, end) : textDecoder.decode(bytes.subarray(start, end))
      }
      str += String.fromCharCode(c)
    }
    return str
  }
  return options.strictUtf8 === true ? decodeStrict(bytes, start, end) : textDecoder.decode(bytes.subarray(start, end))
}

/**
 * Strict decode of text that is non-ASCII or long. Throws a decode error on
 * invalid UTF-8 (RFC 8949 section 3.1).
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} end
 * @returns {string}
 */
function decodeStrict (bytes, start, end) {
  try {
    return fatalDecoder.decode(bytes.subarray(start, end))
  } catch {
    throw new Error(`${decodeErrPrefix} invalid UTF-8 in text string`)
  }
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} prefix
 * @param {number} length
 * @param {DecodeOptions} options
 * @returns {Token}
 */
function toToken (data, pos, prefix, length, options) {
  const totLength = prefix + length
  assertEnoughData(data, pos, totLength)
  const tok = new Token(Type.string, toStr(data, pos + prefix, pos + totLength, options), totLength)
  if (options.retainStringBytes === true) {
    tok.byteValue = data.slice(pos + prefix, pos + totLength)
  }
  return tok
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeStringCompact (data, pos, minor, options) {
  return toToken(data, pos, 1, minor, options)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeString8 (data, pos, _minor, options) {
  return toToken(data, pos, 2, uint.readUint8(data, pos + 1, options), options)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeString16 (data, pos, _minor, options) {
  return toToken(data, pos, 3, uint.readUint16(data, pos + 1, options), options)
}

/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeString32 (data, pos, _minor, options) {
  return toToken(data, pos, 5, uint.readUint32(data, pos + 1, options), options)
}

// TODO: maybe we shouldn't support this ..
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeString64 (data, pos, _minor, options) {
  const l = uint.readUint64(data, pos + 1, options)
  if (typeof l === 'bigint') {
    throw new Error(`${decodeErrPrefix} 64-bit integer string lengths not supported`)
  }
  return toToken(data, pos, 9, l, options)
}

export const encodeString = encodeBytes
