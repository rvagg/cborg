// Use Uint8Array directly in the browser, use Buffer in Node.js but don't
// speak its name directly to avoid bundlers pulling in the `Buffer` polyfill

// @ts-ignore
export const useBuffer = globalThis.process &&
  // @ts-ignore
  !globalThis.process.browser &&
  // @ts-ignore
  globalThis.Buffer &&
  // @ts-ignore
  typeof globalThis.Buffer.isBuffer === 'function'

const textEncoder = new TextEncoder()

/**
 * @typedef {import('../interface.js').ByteView} ByteView
 * @typedef {import('../interface.js').AllocatedByteView} AllocatedByteView
 */

/**
 * @param {Uint8Array} buf
 * @returns {boolean}
 */
function isBuffer (buf) {
  // @ts-ignore
  return useBuffer && globalThis.Buffer.isBuffer(buf)
}

/**
 * @param {ByteView|number[]} buf
 * @returns {ByteView}
 */
export function asU8A (buf) {
  if (!(buf instanceof Uint8Array)) {
    return Uint8Array.from(buf)
  }
  return isBuffer(buf) ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) : buf
}

// Threshold for manual UTF-8 encoding vs native methods.
// Node.js Buffer.from: crossover ~24 chars
// Browser TextEncoder: crossover ~200 chars
const FROM_STRING_THRESHOLD_BUFFER = 24
const FROM_STRING_THRESHOLD_TEXTENCODER = 200

export const fromString = useBuffer
  ? // eslint-disable-line operator-linebreak
    /**
     * @param {string} string
     */
    (string) => {
      return string.length >= FROM_STRING_THRESHOLD_BUFFER
        ? // eslint-disable-line operator-linebreak
      // @ts-ignore
        globalThis.Buffer.from(string)
        : utf8ToBytes(string)
    }
  : // eslint-disable-line operator-linebreak
    /**
     * @param {string} string
     */
    (string) => {
      return string.length >= FROM_STRING_THRESHOLD_TEXTENCODER ? textEncoder.encode(string) : utf8ToBytes(string)
    }

/**
 * Buffer variant not fast enough for what we need
 * @param {number[]} arr
 * @returns {AllocatedByteView}
 */
export const fromArray = (arr) => {
  return Uint8Array.from(arr)
}

export const slice = useBuffer
  ? // eslint-disable-line operator-linebreak
    /**
     * @param {Uint8Array} bytes
     * @param {number} start
     * @param {number} end
     */
    // Buffer.slice() returns a view, not a copy, so we need special handling
    (bytes, start, end) => {
      if (isBuffer(bytes)) {
        return new Uint8Array(bytes.subarray(start, end))
      }
      return bytes.slice(start, end)
    }
  : // eslint-disable-line operator-linebreak
    /**
     * @param {Uint8Array} bytes
     * @param {number} start
     * @param {number} end
     */
    (bytes, start, end) => {
      return bytes.slice(start, end)
    }

export const concat = useBuffer
  ? // eslint-disable-line operator-linebreak
    /**
     * @param {ByteView[]} chunks
     * @param {number} length
     * @returns {AllocatedByteView}
     */
    (chunks, length) => {
      // might get a stray plain Array here
      chunks = chunks.map((c) => c instanceof Uint8Array
        ? c
        : // eslint-disable-line operator-linebreak
        // @ts-ignore
        globalThis.Buffer.from(c))
      // @ts-ignore
      return /** @type {AllocatedByteView} */ (asU8A(globalThis.Buffer.concat(chunks, length)))
    }
  : // eslint-disable-line operator-linebreak
    /**
     * @param {ByteView[]} chunks
     * @param {number} length
     * @returns {AllocatedByteView}
     */
    (chunks, length) => {
      const out = new Uint8Array(length)
      let off = 0
      for (let b of chunks) {
        if (off + b.length > out.length) {
          // final chunk that's bigger than we need
          b = b.subarray(0, out.length - off)
        }
        out.set(b, off)
        off += b.length
      }
      return out
    }

export const alloc = useBuffer
  ? // eslint-disable-line operator-linebreak
    /**
     * @param {number} size
     * @returns {AllocatedByteView}
     */
    (size) => {
      // we always write over the contents we expose so this should be safe
      // @ts-ignore
      return globalThis.Buffer.allocUnsafe(size)
    }
  : // eslint-disable-line operator-linebreak
    /**
     * @param {number} size
     * @returns {AllocatedByteView}
     */
    (size) => {
      return new Uint8Array(size)
    }

export const toHex = useBuffer
  ? // eslint-disable-line operator-linebreak
    /**
     * @param {Uint8Array} d
     * @returns {string}
     */
    (d) => {
      if (typeof d === 'string') {
        return d
      }
      // @ts-ignore
      return globalThis.Buffer.from(toBytes(d)).toString('hex')
    }
  : // eslint-disable-line operator-linebreak
    /**
     * @param {Uint8Array} d
     * @returns {string}
     */
    (d) => {
      if (typeof d === 'string') {
        return d
      }
      // @ts-ignore not smart enough to figure this out
      return Array.prototype.reduce.call(toBytes(d), (p, c) => `${p}${c.toString(16).padStart(2, '0')}`, '')
    }

export const fromHex = useBuffer
  ? // eslint-disable-line operator-linebreak
  /**
   * @param {string|ByteView} hex
   * @returns {ByteView}
   */
    (hex) => {
      if (hex instanceof Uint8Array) {
        return hex
      }
      // @ts-ignore
      return globalThis.Buffer.from(hex, 'hex')
    }
  : // eslint-disable-line operator-linebreak
  /**
   * @param {string|ByteView} hex
   * @returns {ByteView}
   */
    (hex) => {
      if (hex instanceof Uint8Array) {
        return hex
      }
      if (!hex.length) {
        return new Uint8Array(0)
      }
      return new Uint8Array(hex.split('')
        .map((/** @type {string} */ c, /** @type {number} */ i, /** @type {string[]} */ d) => i % 2 === 0 ? `0x${c}${d[i + 1]}` : '')
        .filter(Boolean)
        .map((/** @type {string} */ e) => parseInt(e, 16)))
    }

/**
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} obj
 * @returns {Uint8Array}
 */
function toBytes (obj) {
  if (obj instanceof Uint8Array && obj.constructor.name === 'Uint8Array') {
    return obj
  }
  if (obj instanceof ArrayBuffer) {
    return new Uint8Array(obj)
  }
  if (ArrayBuffer.isView(obj)) {
    return new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength)
  }
  throw new Error('Unknown type, must be binary type')
}

/**
 * @param {Uint8Array} b1
 * @param {Uint8Array} b2
 * @returns {number}
 */
export function compare (b1, b2) {
  if (isBuffer(b1) && isBuffer(b2)) {
    // probably not possible to get here in the current API
    // @ts-ignore Buffer
    return b1.compare(b2)
  }
  for (let i = 0; i < b1.length; i++) {
    if (b1[i] === b2[i]) {
      continue
    }
    return b1[i] < b2[i] ? -1 : 1
  }
  return 0
}

// The below code is taken from https://github.com/google/closure-library/blob/8598d87242af59aac233270742c8984e2b2bdbe0/closure/goog/crypt/crypt.js#L117-L143
// Licensed Apache-2.0.

/**
 * @param {string} str
 * @returns {number[]}
 */
function utf8ToBytes (str) {
  const out = []
  let p = 0
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i)
    if (c < 128) {
      out[p++] = c
    } else if (c < 2048) {
      out[p++] = (c >> 6) | 192
      out[p++] = (c & 63) | 128
    } else if (
      ((c & 0xFC00) === 0xD800) && (i + 1) < str.length &&
      ((str.charCodeAt(i + 1) & 0xFC00) === 0xDC00)) {
      // Surrogate Pair
      c = 0x10000 + ((c & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF)
      out[p++] = (c >> 18) | 240
      out[p++] = ((c >> 12) & 63) | 128
      out[p++] = ((c >> 6) & 63) | 128
      out[p++] = (c & 63) | 128
    } else {
      if ((c >= 0xD800) && (c <= 0xDFFF)) {
        c = 0xFFFD // Unpaired Surrogate
      }
      out[p++] = (c >> 12) | 224
      out[p++] = ((c >> 6) & 63) | 128
      out[p++] = (c & 63) | 128
    }
  }
  return out
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
const MAX_ARGUMENTS_LENGTH = 0x1000

/**
 * @param {number[]} codePoints
 * @returns {string}
 */
export function decodeCodePointsArray (codePoints) {
  const len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }
  // Decode in chunks to avoid "call stack size exceeded".
  let res = ''
  let i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}
