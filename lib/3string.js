import { Token, Type } from './token.js'
import { assertEnoughData, decodeErrPrefix } from './common.js'
import * as uint from './0uint.js'
import { encodeBytes } from './2bytes.js'

const textDecoder = new TextDecoder()

// Threshold for ASCII fast-path vs TextDecoder. Short ASCII strings (common for
// map keys) are faster to decode with a simple loop than TextDecoder overhead.
const ASCII_THRESHOLD = 32

/**
 * @typedef {import('../interface').ByteWriter} ByteWriter
 * @typedef {import('../interface').DecodeOptions} DecodeOptions
 */

/**
 * Decode UTF-8 bytes to string. For short ASCII strings (common case for map keys),
 * a simple loop is faster than TextDecoder.
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} end
 * @returns {string}
 */
function toStr (bytes, start, end) {
  const len = end - start
  if (len < ASCII_THRESHOLD) {
    let str = ''
    for (let i = start; i < end; i++) {
      const c = bytes[i]
      if (c & 0x80) { // non-ASCII, fall back to TextDecoder
        return textDecoder.decode(bytes.subarray(start, end))
      }
      str += String.fromCharCode(c)
    }
    return str
  }
  return textDecoder.decode(bytes.subarray(start, end))
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
  const tok = new Token(Type.string, toStr(data, pos + prefix, pos + totLength), totLength)
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
