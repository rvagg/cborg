/**
 * cborg/extended - Extended JavaScript type support for CBOR
 *
 * This module provides encode/decode functions that support extended JavaScript
 * types: Date, RegExp, Map, Set, BigInt, and all TypedArray types.
 *
 * Similar to the browser's structured clone algorithm, this module prioritises
 * JavaScript type preservation using standard CBOR tags. Unlike base cborg
 * (designed for IPLD/content-addressed data), types round-trip with full fidelity.
 */

import { encode as _encode, decode as _decode } from '../../cborg.js'
import {
  // BigInt
  structBigIntEncoder,
  bigIntDecoder,
  bigNegIntDecoder,

  // Date
  dateEncoder,
  dateDecoder,

  // RegExp
  regExpEncoder,
  regExpDecoder,

  // Set
  setEncoder,
  setDecoder,

  // Map
  mapEncoder,
  mapDecoder,

  // Error
  errorEncoder,
  errorDecoder,

  // Negative zero
  negativeZeroEncoder,

  // TypedArrays
  uint8ArrayEncoder,
  uint8ArrayDecoder,
  uint8ClampedArrayEncoder,
  uint8ClampedArrayDecoder,
  int8ArrayEncoder,
  int8ArrayDecoder,
  uint16ArrayEncoder,
  uint16ArrayDecoder,
  uint32ArrayEncoder,
  uint32ArrayDecoder,
  int16ArrayEncoder,
  int16ArrayDecoder,
  int32ArrayEncoder,
  int32ArrayDecoder,
  float32ArrayEncoder,
  float32ArrayDecoder,
  float64ArrayEncoder,
  float64ArrayDecoder,
  bigUint64ArrayEncoder,
  bigUint64ArrayDecoder,
  bigInt64ArrayEncoder,
  bigInt64ArrayDecoder,

  // Tag constants
  TAG_DATE_EPOCH,
  TAG_BIGINT_POS,
  TAG_BIGINT_NEG,
  TAG_OBJECT_CLASS,
  TAG_UINT8_ARRAY,
  TAG_UINT8_CLAMPED_ARRAY,
  TAG_INT8_ARRAY,
  TAG_UINT16_ARRAY_LE,
  TAG_UINT32_ARRAY_LE,
  TAG_BIGUINT64_ARRAY_LE,
  TAG_INT16_ARRAY_LE,
  TAG_INT32_ARRAY_LE,
  TAG_BIGINT64_ARRAY_LE,
  TAG_FLOAT32_ARRAY_LE,
  TAG_FLOAT64_ARRAY_LE,
  TAG_SET,
  TAG_MAP,
  TAG_REGEXP
} from '../taglib.js'

/**
 * @typedef {import('../../interface').EncodeOptions} EncodeOptions
 * @typedef {import('../../interface').DecodeOptions} DecodeOptions
 */

/**
 * Type encoders for all supported types
 */
const typeEncoders = {
  number: negativeZeroEncoder,
  bigint: structBigIntEncoder,
  Date: dateEncoder,
  RegExp: regExpEncoder,
  Set: setEncoder,
  Map: mapEncoder,
  Error: errorEncoder,
  EvalError: errorEncoder,
  RangeError: errorEncoder,
  ReferenceError: errorEncoder,
  SyntaxError: errorEncoder,
  TypeError: errorEncoder,
  URIError: errorEncoder,
  Uint8Array: uint8ArrayEncoder,
  Uint8ClampedArray: uint8ClampedArrayEncoder,
  Int8Array: int8ArrayEncoder,
  Uint16Array: uint16ArrayEncoder,
  Uint32Array: uint32ArrayEncoder,
  Int16Array: int16ArrayEncoder,
  Int32Array: int32ArrayEncoder,
  Float32Array: float32ArrayEncoder,
  Float64Array: float64ArrayEncoder,
  BigUint64Array: bigUint64ArrayEncoder,
  BigInt64Array: bigInt64ArrayEncoder
}

/**
 * Tag decoders for all supported tags
 */
const tags = {
  [TAG_DATE_EPOCH]: dateDecoder,
  [TAG_BIGINT_POS]: bigIntDecoder,
  [TAG_BIGINT_NEG]: bigNegIntDecoder,
  [TAG_OBJECT_CLASS]: errorDecoder,
  [TAG_REGEXP]: regExpDecoder,
  [TAG_SET]: setDecoder,
  [TAG_MAP]: mapDecoder,
  [TAG_UINT8_ARRAY]: uint8ArrayDecoder,
  [TAG_UINT8_CLAMPED_ARRAY]: uint8ClampedArrayDecoder,
  [TAG_INT8_ARRAY]: int8ArrayDecoder,
  [TAG_UINT16_ARRAY_LE]: uint16ArrayDecoder,
  [TAG_UINT32_ARRAY_LE]: uint32ArrayDecoder,
  [TAG_INT16_ARRAY_LE]: int16ArrayDecoder,
  [TAG_INT32_ARRAY_LE]: int32ArrayDecoder,
  [TAG_FLOAT32_ARRAY_LE]: float32ArrayDecoder,
  [TAG_FLOAT64_ARRAY_LE]: float64ArrayDecoder,
  [TAG_BIGUINT64_ARRAY_LE]: bigUint64ArrayDecoder,
  [TAG_BIGINT64_ARRAY_LE]: bigInt64ArrayDecoder
}

/**
 * Encode a value to CBOR with extended JavaScript type support.
 *
 * Supported types beyond standard cborg:
 * - Date (Tag 1)
 * - RegExp (Tag 21066)
 * - Map (Tag 259)
 * - Set (Tag 258)
 * - BigInt (Tags 2/3, always tagged)
 * - All TypedArrays (Tags 64-87)
 *
 * @param {any} obj - Value to encode
 * @param {EncodeOptions} [options] - Additional options (merged with extended defaults)
 * @returns {Uint8Array}
 */
export function encode (obj, options = {}) {
  return _encode(obj, {
    mapSorter: undefined, // Preserve insertion order for type fidelity (like structured clone)
    ...options,
    typeEncoders: { ...typeEncoders, ...options.typeEncoders }
  })
}

/**
 * Decode CBOR to a value with extended JavaScript type support.
 *
 * @param {Uint8Array} data - CBOR data to decode
 * @param {DecodeOptions} [options] - Additional options (merged with extended defaults)
 * @returns {any}
 */
export function decode (data, options = {}) {
  return _decode(data, {
    ...options,
    tags: { ...tags, ...options.tags }
    // useMaps defaults to false: plain objects decode as objects, Tag 259 Maps decode as Maps.
    // The mapDecoder uses decode.entries() to preserve key types regardless of useMaps setting.
  })
}

// Re-export all taglib components for users who want to customize
export {
  // Tag constants
  TAG_DATE_EPOCH,
  TAG_BIGINT_POS,
  TAG_BIGINT_NEG,
  TAG_UINT8_ARRAY,
  TAG_UINT8_CLAMPED_ARRAY,
  TAG_INT8_ARRAY,
  TAG_UINT16_ARRAY_LE,
  TAG_UINT32_ARRAY_LE,
  TAG_BIGUINT64_ARRAY_LE,
  TAG_INT16_ARRAY_LE,
  TAG_INT32_ARRAY_LE,
  TAG_BIGINT64_ARRAY_LE,
  TAG_FLOAT32_ARRAY_LE,
  TAG_FLOAT64_ARRAY_LE,
  TAG_SET,
  TAG_MAP,
  TAG_REGEXP,

  // BigInt
  structBigIntEncoder,
  bigIntDecoder,
  bigNegIntDecoder,

  // Date
  dateEncoder,
  dateDecoder,

  // RegExp
  regExpEncoder,
  regExpDecoder,

  // Set
  setEncoder,
  setDecoder,

  // Map
  mapEncoder,
  mapDecoder,

  // TypedArrays
  uint8ArrayEncoder,
  uint8ArrayDecoder,
  uint8ClampedArrayEncoder,
  uint8ClampedArrayDecoder,
  int8ArrayEncoder,
  int8ArrayDecoder,
  uint16ArrayEncoder,
  uint16ArrayDecoder,
  uint32ArrayEncoder,
  uint32ArrayDecoder,
  int16ArrayEncoder,
  int16ArrayDecoder,
  int32ArrayEncoder,
  int32ArrayDecoder,
  float32ArrayEncoder,
  float32ArrayDecoder,
  float64ArrayEncoder,
  float64ArrayDecoder,
  bigUint64ArrayEncoder,
  bigUint64ArrayDecoder,
  bigInt64ArrayEncoder,
  bigInt64ArrayDecoder
}
