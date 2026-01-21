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
export function encode(obj: any, options?: EncodeOptions): Uint8Array;
/**
 * Decode CBOR to a value with extended JavaScript type support.
 *
 * @param {Uint8Array} data - CBOR data to decode
 * @param {DecodeOptions} [options] - Additional options (merged with extended defaults)
 * @returns {any}
 */
export function decode(data: Uint8Array, options?: DecodeOptions): any;
export type EncodeOptions = import("../../interface").EncodeOptions;
export type DecodeOptions = import("../../interface").DecodeOptions;
import { TAG_DATE_EPOCH } from '../taglib.js';
import { TAG_BIGINT_POS } from '../taglib.js';
import { TAG_BIGINT_NEG } from '../taglib.js';
import { TAG_UINT8_ARRAY } from '../taglib.js';
import { TAG_UINT8_CLAMPED_ARRAY } from '../taglib.js';
import { TAG_INT8_ARRAY } from '../taglib.js';
import { TAG_UINT16_ARRAY_LE } from '../taglib.js';
import { TAG_UINT32_ARRAY_LE } from '../taglib.js';
import { TAG_BIGUINT64_ARRAY_LE } from '../taglib.js';
import { TAG_INT16_ARRAY_LE } from '../taglib.js';
import { TAG_INT32_ARRAY_LE } from '../taglib.js';
import { TAG_BIGINT64_ARRAY_LE } from '../taglib.js';
import { TAG_FLOAT32_ARRAY_LE } from '../taglib.js';
import { TAG_FLOAT64_ARRAY_LE } from '../taglib.js';
import { TAG_SET } from '../taglib.js';
import { TAG_MAP } from '../taglib.js';
import { TAG_REGEXP } from '../taglib.js';
import { structBigIntEncoder } from '../taglib.js';
import { bigIntDecoder } from '../taglib.js';
import { bigNegIntDecoder } from '../taglib.js';
import { dateEncoder } from '../taglib.js';
import { dateDecoder } from '../taglib.js';
import { regExpEncoder } from '../taglib.js';
import { regExpDecoder } from '../taglib.js';
import { setEncoder } from '../taglib.js';
import { setDecoder } from '../taglib.js';
import { mapEncoder } from '../taglib.js';
import { mapDecoder } from '../taglib.js';
import { uint8ArrayEncoder } from '../taglib.js';
import { uint8ArrayDecoder } from '../taglib.js';
import { uint8ClampedArrayEncoder } from '../taglib.js';
import { uint8ClampedArrayDecoder } from '../taglib.js';
import { int8ArrayEncoder } from '../taglib.js';
import { int8ArrayDecoder } from '../taglib.js';
import { uint16ArrayEncoder } from '../taglib.js';
import { uint16ArrayDecoder } from '../taglib.js';
import { uint32ArrayEncoder } from '../taglib.js';
import { uint32ArrayDecoder } from '../taglib.js';
import { int16ArrayEncoder } from '../taglib.js';
import { int16ArrayDecoder } from '../taglib.js';
import { int32ArrayEncoder } from '../taglib.js';
import { int32ArrayDecoder } from '../taglib.js';
import { float32ArrayEncoder } from '../taglib.js';
import { float32ArrayDecoder } from '../taglib.js';
import { float64ArrayEncoder } from '../taglib.js';
import { float64ArrayDecoder } from '../taglib.js';
import { bigUint64ArrayEncoder } from '../taglib.js';
import { bigUint64ArrayDecoder } from '../taglib.js';
import { bigInt64ArrayEncoder } from '../taglib.js';
import { bigInt64ArrayDecoder } from '../taglib.js';
export { TAG_DATE_EPOCH, TAG_BIGINT_POS, TAG_BIGINT_NEG, TAG_UINT8_ARRAY, TAG_UINT8_CLAMPED_ARRAY, TAG_INT8_ARRAY, TAG_UINT16_ARRAY_LE, TAG_UINT32_ARRAY_LE, TAG_BIGUINT64_ARRAY_LE, TAG_INT16_ARRAY_LE, TAG_INT32_ARRAY_LE, TAG_BIGINT64_ARRAY_LE, TAG_FLOAT32_ARRAY_LE, TAG_FLOAT64_ARRAY_LE, TAG_SET, TAG_MAP, TAG_REGEXP, structBigIntEncoder, bigIntDecoder, bigNegIntDecoder, dateEncoder, dateDecoder, regExpEncoder, regExpDecoder, setEncoder, setDecoder, mapEncoder, mapDecoder, uint8ArrayEncoder, uint8ArrayDecoder, uint8ClampedArrayEncoder, uint8ClampedArrayDecoder, int8ArrayEncoder, int8ArrayDecoder, uint16ArrayEncoder, uint16ArrayDecoder, uint32ArrayEncoder, uint32ArrayDecoder, int16ArrayEncoder, int16ArrayDecoder, int32ArrayEncoder, int32ArrayDecoder, float32ArrayEncoder, float32ArrayDecoder, float64ArrayEncoder, float64ArrayDecoder, bigUint64ArrayEncoder, bigUint64ArrayDecoder, bigInt64ArrayEncoder, bigInt64ArrayDecoder };
//# sourceMappingURL=extended.d.ts.map