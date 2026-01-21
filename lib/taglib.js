import { Token, Type } from '../cborg.js'
import { objectToTokens, Ref } from './encode.js'

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

// =============================================================================
// BigInt (Tags 2/3) - RFC 8949 Section 3.4.3
// =============================================================================

const neg1b = BigInt(-1)
const pos1b = BigInt(1)
const zerob = BigInt(0)
const eightb = BigInt(8)

/**
 * Decode a positive bignum from bytes (Tag 2)
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {bigint}
 */
export function bigIntDecoder (decode) {
  const bytes = /** @type {Uint8Array} */ (decode())
  let bi = zerob
  for (let ii = 0; ii < bytes.length; ii++) {
    bi = (bi << eightb) + BigInt(bytes[ii])
  }
  return bi
}

/**
 * Convert a BigInt to bytes
 * @param {bigint} bi
 * @returns {Uint8Array}
 */
const ffb = BigInt(0xff)
/**
 * @param {bigint} bi
 */
function fromBigInt (bi) {
  const buf = []
  while (bi > 0) {
    // Use BigInt operations to avoid Number precision loss
    buf.unshift(Number(bi & ffb))
    bi >>= eightb
  }
  return Uint8Array.from(buf.length ? buf : [0])
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
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {bigint}
 */
export function bigNegIntDecoder (decode) {
  const bytes = /** @type {Uint8Array} */ (decode())
  let bi = zerob
  for (let ii = 0; ii < bytes.length; ii++) {
    bi = (bi << eightb) + BigInt(bytes[ii])
  }
  return neg1b - bi
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
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {Date}
 */
export function dateDecoder (decode) {
  const seconds = /** @type {number} */ (decode())
  return new Date(seconds * 1000)
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
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {RegExp}
 */
export function regExpDecoder (decode) {
  const val = /** @type {string[]|string} */ (decode())
  if (Array.isArray(val)) {
    return new RegExp(val[0], val[1] || '')
  }
  return new RegExp(val)
}

// =============================================================================
// Set (Tag 258) - IANA Registry
// =============================================================================

/**
 * Encode a Set as Tag 258 + array
 * This is a typeEncoder, receives (obj, typ, options, refStack)
 * @param {Set<any>} set
 * @param {string} _typ
 * @param {import('../interface').EncodeOptions} options
 * @param {import('../interface').Reference} [refStack]
 * @returns {import('../interface').TokenOrNestedTokens[]}
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
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {Set<any>}
 */
export function setDecoder (decode) {
  const val = /** @type {any[]} */ (decode())
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
 * @param {import('../interface').EncodeOptions} options
 * @param {import('../interface').Reference} [refStack]
 * @returns {import('../interface').TokenOrNestedTokens[]}
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
 * @param {import('../interface').TagDecodeControl} decode
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
 * @param {new (buffer: ArrayBuffer) => T} TypedArrayClass
 * @returns {(decode: import('../interface').TagDecodeControl) => T}
 */
function createTypedArrayDecoder (TypedArrayClass) {
  return function (decode) {
    const bytes = /** @type {Uint8Array} */ (decode())
    // bytes is a Uint8Array, need to get properly sliced ArrayBuffer
    const buffer = /** @type {ArrayBuffer} */ (bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
    return new TypedArrayClass(buffer)
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
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {Error}
 */
export function errorDecoder (decode) {
  const arr = /** @type {[string, string]} */ (decode())
  const [className, message] = arr
  const Ctor = errorConstructors[className] || Error
  const err = new Ctor(message)
  // If the constructor doesn't match (e.g., custom error name), set the name
  if (err.name !== className && className in errorConstructors) {
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
