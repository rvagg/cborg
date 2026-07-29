import { Token } from '../cborg.js';
export declare const TAG_DATE_STRING = 0;
export declare const TAG_DATE_EPOCH = 1;
export declare const TAG_BIGINT_POS = 2;
export declare const TAG_BIGINT_NEG = 3;
export declare const TAG_UINT8_ARRAY = 64;
export declare const TAG_UINT8_CLAMPED_ARRAY = 68;
export declare const TAG_INT8_ARRAY = 72;
export declare const TAG_UINT16_ARRAY_LE = 69;
export declare const TAG_UINT32_ARRAY_LE = 70;
export declare const TAG_BIGUINT64_ARRAY_LE = 71;
export declare const TAG_INT16_ARRAY_LE = 77;
export declare const TAG_INT32_ARRAY_LE = 78;
export declare const TAG_BIGINT64_ARRAY_LE = 79;
export declare const TAG_FLOAT32_ARRAY_LE = 85;
export declare const TAG_FLOAT64_ARRAY_LE = 86;
export declare const TAG_OBJECT_CLASS = 27;
export declare const TAG_SET = 258;
export declare const TAG_MAP = 259;
export declare const TAG_REGEXP = 21066;
/**
 * Decode a positive bignum from bytes (Tag 2)
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {bigint}
 */
export declare function bigIntDecoder(decode: import('../interface.js').TagDecodeControl): bigint;
/**
 * Encode a BigInt, only using tags for values outside 64-bit range (IPLD compatible)
 * @param {bigint} obj
 * @returns {Token[]|null}
 */
export declare function bigIntEncoder(obj: bigint): Token[] | null;
/**
 * Encode a BigInt, always using tags 2/3 (for extended mode, full round-trip fidelity)
 * @param {bigint} obj
 * @returns {Token[]}
 */
export declare function structBigIntEncoder(obj: bigint): Token[];
/**
 * Decode a negative bignum from bytes (Tag 3)
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {bigint}
 */
export declare function bigNegIntDecoder(decode: import('../interface.js').TagDecodeControl): bigint;
/**
 * Encode a Date as Tag 1 (epoch seconds as float)
 * @param {Date} date
 * @returns {Token[]}
 */
export declare function dateEncoder(date: Date): Token[];
/**
 * Decode Tag 1 (epoch seconds) to a Date
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {Date}
 */
export declare function dateDecoder(decode: import('../interface.js').TagDecodeControl): Date;
/**
 * Encode a RegExp as Tag 21066
 * @param {RegExp} re
 * @returns {Token[]}
 */
export declare function regExpEncoder(re: RegExp): Token[];
/**
 * Decode Tag 21066 to a RegExp
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {RegExp}
 */
export declare function regExpDecoder(decode: import('../interface.js').TagDecodeControl): RegExp;
/**
 * Encode a Set as Tag 258 + array
 * This is a typeEncoder, receives (obj, typ, options, refStack)
 * @param {Set<any>} set
 * @param {string} _typ
 * @param {import('../interface.js').EncodeOptions} options
 * @param {import('../interface.js').Reference} [refStack]
 * @returns {import('../interface.js').TokenOrNestedTokens[]}
 */
export declare function setEncoder(set: Set<any>, _typ: string, options: import('../interface.js').EncodeOptions, refStack?: import('../interface.js').Reference): import('../interface.js').TokenOrNestedTokens[];
/**
 * Decode Tag 258 to a Set
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {Set<any>}
 */
export declare function setDecoder(decode: import('../interface.js').TagDecodeControl): Set<any>;
/**
 * Encode a Map as Tag 259 + CBOR map
 * This is a typeEncoder, receives (obj, typ, options, refStack)
 * @param {Map<any, any>} map
 * @param {string} _typ
 * @param {import('../interface.js').EncodeOptions} options
 * @param {import('../interface.js').Reference} [refStack]
 * @returns {import('../interface.js').TokenOrNestedTokens[]}
 */
export declare function mapEncoder(map: Map<any, any>, _typ: string, options: import('../interface.js').EncodeOptions, refStack?: import('../interface.js').Reference): import('../interface.js').TokenOrNestedTokens[];
/**
 * Decode Tag 259 to a Map
 * Uses decode.entries() to preserve key types (integers, etc.) regardless of useMaps setting
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {Map<any, any>}
 */
export declare function mapDecoder(decode: import('../interface.js').TagDecodeControl): Map<any, any>;
export declare const uint8ArrayEncoder: (arr: ArrayBufferView) => Token[];
export declare const uint8ArrayDecoder: (decode: import('../interface.js').TagDecodeControl) => Uint8Array<ArrayBuffer>;
export declare const uint8ClampedArrayEncoder: (arr: ArrayBufferView) => Token[];
export declare const uint8ClampedArrayDecoder: (decode: import('../interface.js').TagDecodeControl) => Uint8ClampedArray<ArrayBuffer>;
export declare const int8ArrayEncoder: (arr: ArrayBufferView) => Token[];
export declare const int8ArrayDecoder: (decode: import('../interface.js').TagDecodeControl) => Int8Array<ArrayBuffer>;
export declare const uint16ArrayEncoder: (arr: ArrayBufferView) => Token[];
export declare const uint16ArrayDecoder: (decode: import('../interface.js').TagDecodeControl) => Uint16Array<ArrayBuffer>;
export declare const uint32ArrayEncoder: (arr: ArrayBufferView) => Token[];
export declare const uint32ArrayDecoder: (decode: import('../interface.js').TagDecodeControl) => Uint32Array<ArrayBuffer>;
export declare const bigUint64ArrayEncoder: (arr: ArrayBufferView) => Token[];
export declare const bigUint64ArrayDecoder: (decode: import('../interface.js').TagDecodeControl) => BigUint64Array<ArrayBuffer>;
export declare const int16ArrayEncoder: (arr: ArrayBufferView) => Token[];
export declare const int16ArrayDecoder: (decode: import('../interface.js').TagDecodeControl) => Int16Array<ArrayBuffer>;
export declare const int32ArrayEncoder: (arr: ArrayBufferView) => Token[];
export declare const int32ArrayDecoder: (decode: import('../interface.js').TagDecodeControl) => Int32Array<ArrayBuffer>;
export declare const bigInt64ArrayEncoder: (arr: ArrayBufferView) => Token[];
export declare const bigInt64ArrayDecoder: (decode: import('../interface.js').TagDecodeControl) => BigInt64Array<ArrayBuffer>;
export declare const float32ArrayEncoder: (arr: ArrayBufferView) => Token[];
export declare const float32ArrayDecoder: (decode: import('../interface.js').TagDecodeControl) => Float32Array<ArrayBuffer>;
export declare const float64ArrayEncoder: (arr: ArrayBufferView) => Token[];
export declare const float64ArrayDecoder: (decode: import('../interface.js').TagDecodeControl) => Float64Array<ArrayBuffer>;
/**
 * Encode an Error as Tag 27: [className, message]
 * @param {Error} err
 * @returns {Token[]}
 */
export declare function errorEncoder(err: Error): Token[];
/**
 * Decode Tag 27 to an Error (or Error subclass)
 * @param {import('../interface.js').TagDecodeControl} decode
 * @returns {Error}
 */
export declare function errorDecoder(decode: import('../interface.js').TagDecodeControl): Error;
/**
 * Encode a number, preserving -0 as a float
 * Use this as a typeEncoder for 'number' to preserve -0 fidelity
 * @param {number} num
 * @returns {Token[] | null}
 */
export declare function negativeZeroEncoder(num: number): Token[] | null;
//# sourceMappingURL=taglib.d.ts.map