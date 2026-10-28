import { Token, Type } from '../cborg.js'
import { objectToTokens, Ref } from './encode.js'
import { toHex, fromHex, asU8A } from './byte-utils.js'
import { decodeErrPrefix } from './common.js'

/*
A collection of standard CBOR tags for extended JavaScript type support.

There are no tags included by default in the cborg encoder or decoder, you have
to include them by passing options. `typeEncoders` for encode() and `tags` for
decode().

The encoders here can be included with these options (see the tests for how this
can be done), or as examples for writing additional tags.

For convenience, cborg/extended provides a pre-configured encode/decode that
includes all of these, with type support similar to the browser's structured
clone algorithm.
*/

// =============================================================================
// Tag Constants
// =============================================================================

// Standard Tags (RFC 8949)
export const TAG_DATE_STRING = 0 // RFC 3339 date/time string
export const TAG_DATE_EPOCH = 1 // Epoch-based date/time (integer or float)
export const TAG_BIGINT_POS = 2 // Unsigned bignum
export const TAG_BIGINT_NEG = 3 // Negative bignum

// TypedArray Tags (RFC 8746) - Single-byte arrays (no endianness)
export const TAG_UINT8_ARRAY = 64
export const TAG_UINT8_CLAMPED_ARRAY = 68
export const TAG_INT8_ARRAY = 72

// TypedArray Tags (RFC 8746) - Little-endian multi-byte arrays
export const TAG_UINT16_ARRAY_LE = 69
export const TAG_UINT32_ARRAY_LE = 70
export const TAG_BIGUINT64_ARRAY_LE = 71
export const TAG_INT16_ARRAY_LE = 77
export const TAG_INT32_ARRAY_LE = 78
export const TAG_BIGINT64_ARRAY_LE = 79
export const TAG_FLOAT32_ARRAY_LE = 85
export const TAG_FLOAT64_ARRAY_LE = 86

// Generic Object Tag (IANA Registry)
export const TAG_OBJECT_CLASS = 27 // Serialised object with class name and constructor arguments

// Extended Tags (IANA Registry)
export const TAG_SET = 258 // Mathematical finite set
export const TAG_MAP = 259 // Map datatype
export const TAG_REGEXP = 21066 // ECMAScript RegExp

/**
 * @param {string} message
 * @returns {Error}
 */
function tagError (message) {
  return new Error(`${decodeErrPrefix} ${message}`)
}

// =============================================================================
// BigInt (Tags 2/3) - RFC 8949 Section 3.4.3
// =============================================================================

const neg1b = BigInt(-1)
const pos1b = BigInt(1)
const zerob = BigInt(0)
const eightb = BigInt(8)

/**
 * Big-endian bytes to an unsigned BigInt. Short inputs are shifted in byte by
 * byte, longer ones go via a hex string, which is cheaper from about 9 bytes.
 * The `0x0` prefix makes empty bytes parse as 0.
 * @param {Uint8Array} bytes
 * @returns {bigint}
 */
function toBigInt (bytes) {
  if (bytes.length > 8) {
    return BigInt('0x0' + toHex(bytes))
  }
  let bi = zerob
  for (let ii = 0; ii < bytes.length; ii++) {
    bi = (bi << eightb) + BigInt(bytes[ii])
  }
  return bi
}

/**
 * Decode a positive bignum from bytes (Tag 2)
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {bigint}
 */
export function bigIntDecoder (decode) {
  return toBigInt(bignumBytes(decode()))
}

/**
 * @param {any} bytes
 * @returns {Uint8Array}
 */
function bignumBytes (bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw tagError('bignum tag content must be bytes')
  }
  return bytes
}

/**
 * Non-negative BigInt to minimal big-endian bytes, zero is `[0]`
 * @param {bigint} bi
 * @returns {Uint8Array}
 */
function fromBigInt (bi) {
  if (bi === zerob) {
    return new Uint8Array(1)
  }
  const hex = bi.toString(16)
  return asU8A(fromHex(hex.length % 2 ? '0' + hex : hex))
}

// For IPLD compatibility: only tag BigInts outside 64-bit range
const maxSafeBigInt = BigInt('18446744073709551615') // 2^64 - 1
const minSafeBigInt = BigInt('-18446744073709551616') // -2^64

/**
 * Encode a BigInt, only using tags for values outside 64-bit range (IPLD compatible)
 * @param {bigint} obj
 * @returns {Token[]|null}
 */
export function bigIntEncoder (obj) {
  if (obj >= minSafeBigInt && obj <= maxSafeBigInt) {
    return null // null = encode as native CBOR integer
  }
  return [
    new Token(Type.tag, obj >= zerob ? TAG_BIGINT_POS : TAG_BIGINT_NEG),
    new Token(Type.bytes, fromBigInt(obj >= zerob ? obj : obj * neg1b - pos1b))
  ]
}

/**
 * Encode a BigInt, always using tags 2/3 (for extended mode, full round-trip fidelity)
 * @param {bigint} obj
 * @returns {Token[]}
 */
export function structBigIntEncoder (obj) {
  return [
    new Token(Type.tag, obj >= zerob ? TAG_BIGINT_POS : TAG_BIGINT_NEG),
    new Token(Type.bytes, fromBigInt(obj >= zerob ? obj : obj * neg1b - pos1b))
  ]
}

/**
 * Decode a negative bignum from bytes (Tag 3)
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {bigint}
 */
export function bigNegIntDecoder (decode) {
  return neg1b - toBigInt(bignumBytes(decode()))
}

// =============================================================================
// Date (Tag 1) - RFC 8949 Section 3.4.2
// =============================================================================

/**
 * Encode a Date as Tag 1 (epoch seconds as float)
 * @param {Date} date
 * @returns {Token[]}
 */
export function dateEncoder (date) {
  // Use float for millisecond precision
  const seconds = date.getTime() / 1000
  return [
    new Token(Type.tag, TAG_DATE_EPOCH),
    new Token(Type.float, seconds)
  ]
}

/**
 * Decode Tag 1 (epoch seconds) to a Date
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {Date}
 */
export function dateDecoder (decode) {
  const seconds = decode()
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    throw tagError('date tag content must be a finite number')
  }
  const date = new Date(seconds * 1000)
  if (Number.isNaN(date.getTime())) {
    throw tagError('date tag content is outside the representable range')
  }
  return date
}

// =============================================================================
// RegExp (Tag 21066) - IANA Registry
// =============================================================================

/**
 * Encode a RegExp as Tag 21066
 * @param {RegExp} re
 * @returns {Token[]}
 */
export function regExpEncoder (re) {
  if (re.flags) {
    return [
      new Token(Type.tag, TAG_REGEXP),
      new Token(Type.array, 2),
      new Token(Type.string, re.source),
      new Token(Type.string, re.flags)
    ]
  }
  return [
    new Token(Type.tag, TAG_REGEXP),
    new Token(Type.array, 1),
    new Token(Type.string, re.source)
  ]
}

/**
 * Decode Tag 21066 to a RegExp
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {RegExp}
 */
export function regExpDecoder (decode) {
  const val = decode()
  const parts = Array.isArray(val) ? val : [val]
  if (parts.length < 1 || parts.length > 2 || !parts.every((p) => typeof p === 'string')) {
    throw tagError('RegExp tag content must be a string or an array of [source, flags?] strings')
  }
  const [source, flags] = parts
  try {
    return new RegExp(source, flags || '')
  } catch (/** @type {any} */ err) {
    throw tagError(`invalid RegExp: ${err.message}`)
  }
}

// =============================================================================
// Set (Tag 258) - IANA Registry
// =============================================================================

/**
 * Encode a Set as Tag 258 + array
 * This is a typeEncoder, receives (obj, typ, options, refStack)
 * @param {Set<any>} set
 * @param {string} _typ
 * @param {import('../interface.js').EncodeOptions} options
 * @param {import('../interface.js').Reference} [refStack]
 * @returns {import('../interface.js').TokenOrNestedTokens[]}
 */
export function setEncoder (set, _typ, options, refStack) {
  if (set.size === 0) {
    return [
      new Token(Type.tag, TAG_SET),
      new Token(Type.array, 0)
    ]
  }

  refStack = Ref.createCheck(refStack, set)
  const values = []
  for (const v of set) {
    values.push(objectToTokens(v, options, refStack))
  }

  return [
    new Token(Type.tag, TAG_SET),
    new Token(Type.array, set.size),
    values
  ]
}

/**
 * Decode Tag 258 to a Set
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {Set<any>}
 */
export function setDecoder (decode) {
  const val = decode()
  if (!Array.isArray(val)) {
    throw tagError('Set tag content must be an array')
  }
  return new Set(val)
}

// =============================================================================
// Map (Tag 259) - IANA Registry
// Tag 259 wraps a CBOR map to indicate it should decode as a JS Map
// =============================================================================

/**
 * Encode a Map as Tag 259 + CBOR map
 * This is a typeEncoder, receives (obj, typ, options, refStack)
 * @param {Map<any, any>} map
 * @param {string} _typ
 * @param {import('../interface.js').EncodeOptions} options
 * @param {import('../interface.js').Reference} [refStack]
 * @returns {import('../interface.js').TokenOrNestedTokens[]}
 */
export function mapEncoder (map, _typ, options, refStack) {
  if (map.size === 0) {
    return [
      new Token(Type.tag, TAG_MAP),
      new Token(Type.map, 0)
    ]
  }

  refStack = Ref.createCheck(refStack, map)
  const entries = []
  for (const [key, value] of map) {
    entries.push([
      objectToTokens(key, options, refStack),
      objectToTokens(value, options, refStack)
    ])
  }

  // Sort entries if mapSorter is provided (for deterministic encoding)
  if (options.mapSorter) {
    entries.sort(options.mapSorter)
  }

  return [
    new Token(Type.tag, TAG_MAP),
    new Token(Type.map, map.size),
    entries
  ]
}

/**
 * Decode Tag 259 to a Map
 * Uses decode.entries() to preserve key types (integers, etc.) regardless of useMaps setting
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {Map<any, any>}
 */
export function mapDecoder (decode) {
  return new Map(decode.entries())
}

// =============================================================================
// TypedArrays (Tags 64-87) - RFC 8746
// Uses little-endian tags for multi-byte arrays (JS native byte order)
// =============================================================================

/**
 * Helper to create a TypedArray from an ArrayBuffer
 * @template {ArrayBufferView} T
 * @param {(new (buffer: ArrayBuffer) => T) & { BYTES_PER_ELEMENT: number }} TypedArrayClass
 * @returns {(decode: import('../interface.js').TagDecodeControl) => T}
 */
function createTypedArrayDecoder (TypedArrayClass) {
  return function (decode) {
    const bytes = decode()
    if (!(bytes instanceof Uint8Array)) {
      throw tagError('typed array tag content must be bytes')
    }
    if (bytes.length % TypedArrayClass.BYTES_PER_ELEMENT !== 0) {
      throw tagError(`typed array byte length ${bytes.length} is not a multiple of ${TypedArrayClass.BYTES_PER_ELEMENT}`)
    }
    const { buffer, byteOffset, byteLength } = bytes
    // The tokeniser returns a fresh copy so it's ours to use. Anything else is
    // a view, so copy out its range.
    return new TypedArrayClass(byteOffset === 0 && byteLength === buffer.byteLength
      ? /** @type {ArrayBuffer} */ (buffer)
      : /** @type {ArrayBuffer} */ (buffer.slice(byteOffset, byteOffset + byteLength)))
  }
}

/**
 * Helper to create a TypedArray encoder
 * @param {number} tag
 * @returns {(arr: ArrayBufferView) => Token[]}
 */
function createTypedArrayEncoder (tag) {
  return function (arr) {
    // Get the bytes from the TypedArray's underlying buffer
    const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
    return [
      new Token(Type.tag, tag),
      new Token(Type.bytes, bytes)
    ]
  }
}

// Uint8Array (Tag 64), no endianness concerns
export const uint8ArrayEncoder = createTypedArrayEncoder(TAG_UINT8_ARRAY)
export const uint8ArrayDecoder = createTypedArrayDecoder(Uint8Array)

// Uint8ClampedArray (Tag 68), no endianness concerns
export const uint8ClampedArrayEncoder = createTypedArrayEncoder(TAG_UINT8_CLAMPED_ARRAY)
export const uint8ClampedArrayDecoder = createTypedArrayDecoder(Uint8ClampedArray)

// Int8Array (Tag 72), no endianness concerns
export const int8ArrayEncoder = createTypedArrayEncoder(TAG_INT8_ARRAY)
export const int8ArrayDecoder = createTypedArrayDecoder(Int8Array)

// Uint16Array (Tag 69, little endian)
export const uint16ArrayEncoder = createTypedArrayEncoder(TAG_UINT16_ARRAY_LE)
export const uint16ArrayDecoder = createTypedArrayDecoder(Uint16Array)

// Uint32Array (Tag 70, little endian)
export const uint32ArrayEncoder = createTypedArrayEncoder(TAG_UINT32_ARRAY_LE)
export const uint32ArrayDecoder = createTypedArrayDecoder(Uint32Array)

// BigUint64Array (Tag 71, little endian)
export const bigUint64ArrayEncoder = createTypedArrayEncoder(TAG_BIGUINT64_ARRAY_LE)
export const bigUint64ArrayDecoder = createTypedArrayDecoder(BigUint64Array)

// Int16Array (Tag 77, little endian)
export const int16ArrayEncoder = createTypedArrayEncoder(TAG_INT16_ARRAY_LE)
export const int16ArrayDecoder = createTypedArrayDecoder(Int16Array)

// Int32Array (Tag 78, little endian)
export const int32ArrayEncoder = createTypedArrayEncoder(TAG_INT32_ARRAY_LE)
export const int32ArrayDecoder = createTypedArrayDecoder(Int32Array)

// BigInt64Array (Tag 79, little endian)
export const bigInt64ArrayEncoder = createTypedArrayEncoder(TAG_BIGINT64_ARRAY_LE)
export const bigInt64ArrayDecoder = createTypedArrayDecoder(BigInt64Array)

// Float32Array (Tag 85, little endian)
export const float32ArrayEncoder = createTypedArrayEncoder(TAG_FLOAT32_ARRAY_LE)
export const float32ArrayDecoder = createTypedArrayDecoder(Float32Array)

// Float64Array (Tag 86, little endian)
export const float64ArrayEncoder = createTypedArrayEncoder(TAG_FLOAT64_ARRAY_LE)
export const float64ArrayDecoder = createTypedArrayDecoder(Float64Array)

// =============================================================================
// Error (Tag 27) - IANA "object with class name and constructor arguments"
// Format: Tag 27: [className, message, options?]
// =============================================================================

/**
 * Known JavaScript Error constructors
 * @type {Record<string, ErrorConstructor>}
 */
const errorConstructors = {
  Error,
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError
}

/**
 * Encode an Error as Tag 27: [className, message]
 * @param {Error} err
 * @returns {Token[]}
 */
export function errorEncoder (err) {
  const className = err.name
  // Only encode name and message (not stack, which is environment-specific)
  return [
    new Token(Type.tag, TAG_OBJECT_CLASS),
    new Token(Type.array, 2),
    new Token(Type.string, className),
    new Token(Type.string, err.message)
  ]
}

/**
 * Decode Tag 27 to an Error (or Error subclass)
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {Error}
 */
export function errorDecoder (decode) {
  const arr = decode()
  if (!Array.isArray(arr) || arr.length < 2 || typeof arr[0] !== 'string' || typeof arr[1] !== 'string') {
    throw tagError('Error tag content must be an array of [className, message]')
  }
  const [className, message] = arr
  const known = Object.prototype.hasOwnProperty.call(errorConstructors, className)
  const Ctor = known ? errorConstructors[className] : Error
  const err = new Ctor(message)
  // If the constructor doesn't match (e.g., custom error name), set the name
  if (err.name !== className && known) {
    err.name = className
  }
  return err
}

// =============================================================================
// Negative Zero (-0) Support
// CBOR can represent -0 as a float, but by default numbers encode as integers.
// This encoder ensures -0 is preserved by encoding it as a float.
// =============================================================================

/**
 * Encode a number, preserving -0 as a float
 * Use this as a typeEncoder for 'number' to preserve -0 fidelity
 * @param {number} num
 * @returns {Token[] | null}
 */
export function negativeZeroEncoder (num) {
  if (Object.is(num, -0)) {
    return [new Token(Type.float, -0)]
  }
  // Return null to fall through to default number encoding
  return null
}
