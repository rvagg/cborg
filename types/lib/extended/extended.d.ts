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
import { structBigIntEncoder, bigIntDecoder, bigNegIntDecoder, dateEncoder, dateDecoder, regExpEncoder, regExpDecoder, setEncoder, setDecoder, mapEncoder, mapDecoder, uint8ArrayEncoder, uint8ArrayDecoder, uint8ClampedArrayEncoder, uint8ClampedArrayDecoder, int8ArrayEncoder, int8ArrayDecoder, uint16ArrayEncoder, uint16ArrayDecoder, uint32ArrayEncoder, uint32ArrayDecoder, int16ArrayEncoder, int16ArrayDecoder, int32ArrayEncoder, int32ArrayDecoder, float32ArrayEncoder, float32ArrayDecoder, float64ArrayEncoder, float64ArrayDecoder, bigUint64ArrayEncoder, bigUint64ArrayDecoder, bigInt64ArrayEncoder, bigInt64ArrayDecoder, TAG_DATE_EPOCH, TAG_BIGINT_POS, TAG_BIGINT_NEG, TAG_UINT8_ARRAY, TAG_UINT8_CLAMPED_ARRAY, TAG_INT8_ARRAY, TAG_UINT16_ARRAY_LE, TAG_UINT32_ARRAY_LE, TAG_BIGUINT64_ARRAY_LE, TAG_INT16_ARRAY_LE, TAG_INT32_ARRAY_LE, TAG_BIGINT64_ARRAY_LE, TAG_FLOAT32_ARRAY_LE, TAG_FLOAT64_ARRAY_LE, TAG_SET, TAG_MAP, TAG_REGEXP } from '../taglib.js';
export type EncodeOptions = import('../../interface.js').EncodeOptions;
export type DecodeOptions = import('../../interface.js').DecodeOptions;
export type AllocatedByteView = import('../../interface.js').AllocatedByteView;
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
 * @returns {AllocatedByteView}
 */
export declare function encode(obj: any, options?: EncodeOptions): AllocatedByteView;
/**
 * Decode CBOR to a value with extended JavaScript type support.
 *
 * @param {Uint8Array} data - CBOR data to decode
 * @param {DecodeOptions} [options] - Additional options (merged with extended defaults)
 * @returns {any}
 */
export declare function decode(data: Uint8Array, options?: DecodeOptions): any;
export { TAG_DATE_EPOCH, TAG_BIGINT_POS, TAG_BIGINT_NEG, TAG_UINT8_ARRAY, TAG_UINT8_CLAMPED_ARRAY, TAG_INT8_ARRAY, TAG_UINT16_ARRAY_LE, TAG_UINT32_ARRAY_LE, TAG_BIGUINT64_ARRAY_LE, TAG_INT16_ARRAY_LE, TAG_INT32_ARRAY_LE, TAG_BIGINT64_ARRAY_LE, TAG_FLOAT32_ARRAY_LE, TAG_FLOAT64_ARRAY_LE, TAG_SET, TAG_MAP, TAG_REGEXP, structBigIntEncoder, bigIntDecoder, bigNegIntDecoder, dateEncoder, dateDecoder, regExpEncoder, regExpDecoder, setEncoder, setDecoder, mapEncoder, mapDecoder, uint8ArrayEncoder, uint8ArrayDecoder, uint8ClampedArrayEncoder, uint8ClampedArrayDecoder, int8ArrayEncoder, int8ArrayDecoder, uint16ArrayEncoder, uint16ArrayDecoder, uint32ArrayEncoder, uint32ArrayDecoder, int16ArrayEncoder, int16ArrayDecoder, int32ArrayEncoder, int32ArrayDecoder, float32ArrayEncoder, float32ArrayDecoder, float64ArrayEncoder, float64ArrayDecoder, bigUint64ArrayEncoder, bigUint64ArrayDecoder, bigInt64ArrayEncoder, bigInt64ArrayDecoder };
//# sourceMappingURL=extended.d.ts.map