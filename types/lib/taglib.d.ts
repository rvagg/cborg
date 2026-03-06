/**
 * Decode a positive bignum from bytes (Tag 2)
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {bigint}
 */
export function bigIntDecoder(decode: import("../interface").TagDecodeControl): bigint;
/**
 * Encode a BigInt, only using tags for values outside 64-bit range (IPLD compatible)
 * @param {bigint} obj
 * @returns {Token[]|null}
 */
export function bigIntEncoder(obj: bigint): Token[] | null;
/**
 * Encode a BigInt, always using tags 2/3 (for extended mode, full round-trip fidelity)
 * @param {bigint} obj
 * @returns {Token[]}
 */
export function structBigIntEncoder(obj: bigint): Token[];
/**
 * Decode a negative bignum from bytes (Tag 3)
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {bigint}
 */
export function bigNegIntDecoder(decode: import("../interface").TagDecodeControl): bigint;
/**
 * Encode a Date as Tag 1 (epoch seconds as float)
 * @param {Date} date
 * @returns {Token[]}
 */
export function dateEncoder(date: Date): Token[];
/**
 * Decode Tag 1 (epoch seconds) to a Date
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {Date}
 */
export function dateDecoder(decode: import("../interface").TagDecodeControl): Date;
/**
 * Encode a RegExp as Tag 21066
 * @param {RegExp} re
 * @returns {Token[]}
 */
export function regExpEncoder(re: RegExp): Token[];
/**
 * Decode Tag 21066 to a RegExp
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {RegExp}
 */
export function regExpDecoder(decode: import("../interface").TagDecodeControl): RegExp;
/**
 * Encode a Set as Tag 258 + array
 * This is a typeEncoder, receives (obj, typ, options, refStack)
 * @param {Set<any>} set
 * @param {string} _typ
 * @param {import('../interface').EncodeOptions} options
 * @param {import('../interface').Reference} [refStack]
 * @returns {import('../interface').TokenOrNestedTokens[]}
 */
export function setEncoder(set: Set<any>, _typ: string, options: import("../interface").EncodeOptions, refStack?: import("../interface").Reference): import("../interface").TokenOrNestedTokens[];
/**
 * Decode Tag 258 to a Set
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {Set<any>}
 */
export function setDecoder(decode: import("../interface").TagDecodeControl): Set<any>;
/**
 * Encode a Map as Tag 259 + CBOR map
 * This is a typeEncoder, receives (obj, typ, options, refStack)
 * @param {Map<any, any>} map
 * @param {string} _typ
 * @param {import('../interface').EncodeOptions} options
 * @param {import('../interface').Reference} [refStack]
 * @returns {import('../interface').TokenOrNestedTokens[]}
 */
export function mapEncoder(map: Map<any, any>, _typ: string, options: import("../interface").EncodeOptions, refStack?: import("../interface").Reference): import("../interface").TokenOrNestedTokens[];
/**
 * Decode Tag 259 to a Map
 * Uses decode.entries() to preserve key types (integers, etc.) regardless of useMaps setting
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {Map<any, any>}
 */
export function mapDecoder(decode: import("../interface").TagDecodeControl): Map<any, any>;
/**
 * Encode an Error as Tag 27: [className, message]
 * @param {Error} err
 * @returns {Token[]}
 */
export function errorEncoder(err: Error): Token[];
/**
 * Decode Tag 27 to an Error (or Error subclass)
 * @param {import('../interface').TagDecodeControl} decode
 * @returns {Error}
 */
export function errorDecoder(decode: import("../interface").TagDecodeControl): Error;
/**
 * Encode a number, preserving -0 as a float
 * Use this as a typeEncoder for 'number' to preserve -0 fidelity
 * @param {number} num
 * @returns {Token[] | null}
 */
export function negativeZeroEncoder(num: number): Token[] | null;
export const TAG_DATE_STRING: 0;
export const TAG_DATE_EPOCH: 1;
export const TAG_BIGINT_POS: 2;
export const TAG_BIGINT_NEG: 3;
export const TAG_UINT8_ARRAY: 64;
export const TAG_UINT8_CLAMPED_ARRAY: 68;
export const TAG_INT8_ARRAY: 72;
export const TAG_UINT16_ARRAY_LE: 69;
export const TAG_UINT32_ARRAY_LE: 70;
export const TAG_BIGUINT64_ARRAY_LE: 71;
export const TAG_INT16_ARRAY_LE: 77;
export const TAG_INT32_ARRAY_LE: 78;
export const TAG_BIGINT64_ARRAY_LE: 79;
export const TAG_FLOAT32_ARRAY_LE: 85;
export const TAG_FLOAT64_ARRAY_LE: 86;
export const TAG_OBJECT_CLASS: 27;
export const TAG_SET: 258;
export const TAG_MAP: 259;
export const TAG_REGEXP: 21066;
export const uint8ArrayEncoder: (arr: ArrayBufferView) => Token[];
export const uint8ArrayDecoder: (decode: import("../interface").TagDecodeControl) => Uint8Array<ArrayBuffer>;
export const uint8ClampedArrayEncoder: (arr: ArrayBufferView) => Token[];
export const uint8ClampedArrayDecoder: (decode: import("../interface").TagDecodeControl) => Uint8ClampedArray<ArrayBuffer>;
export const int8ArrayEncoder: (arr: ArrayBufferView) => Token[];
export const int8ArrayDecoder: (decode: import("../interface").TagDecodeControl) => Int8Array<ArrayBuffer>;
export const uint16ArrayEncoder: (arr: ArrayBufferView) => Token[];
export const uint16ArrayDecoder: (decode: import("../interface").TagDecodeControl) => Uint16Array<ArrayBuffer>;
export const uint32ArrayEncoder: (arr: ArrayBufferView) => Token[];
export const uint32ArrayDecoder: (decode: import("../interface").TagDecodeControl) => Uint32Array<ArrayBuffer>;
export const bigUint64ArrayEncoder: (arr: ArrayBufferView) => Token[];
export const bigUint64ArrayDecoder: (decode: import("../interface").TagDecodeControl) => BigUint64Array<ArrayBuffer>;
export const int16ArrayEncoder: (arr: ArrayBufferView) => Token[];
export const int16ArrayDecoder: (decode: import("../interface").TagDecodeControl) => Int16Array<ArrayBuffer>;
export const int32ArrayEncoder: (arr: ArrayBufferView) => Token[];
export const int32ArrayDecoder: (decode: import("../interface").TagDecodeControl) => Int32Array<ArrayBuffer>;
export const bigInt64ArrayEncoder: (arr: ArrayBufferView) => Token[];
export const bigInt64ArrayDecoder: (decode: import("../interface").TagDecodeControl) => BigInt64Array<ArrayBuffer>;
export const float32ArrayEncoder: (arr: ArrayBufferView) => Token[];
export const float32ArrayDecoder: (decode: import("../interface").TagDecodeControl) => Float32Array<ArrayBuffer>;
export const float64ArrayEncoder: (arr: ArrayBufferView) => Token[];
export const float64ArrayDecoder: (decode: import("../interface").TagDecodeControl) => Float64Array<ArrayBuffer>;
import { Token } from '../cborg.js';
//# sourceMappingURL=taglib.d.ts.map