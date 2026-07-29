import { Token } from './token.js';
export type ByteWriter = import('../interface.js').ByteWriter;
export type DecodeOptions = import('../interface.js').DecodeOptions;
export type EncodeOptions = import('../interface.js').EncodeOptions;
/**
 * @typedef {import('../interface.js').ByteWriter} ByteWriter
 * @typedef {import('../interface.js').DecodeOptions} DecodeOptions
 * @typedef {import('../interface.js').EncodeOptions} EncodeOptions
 */
export declare const MINOR_FALSE = 20;
export declare const MINOR_TRUE = 21;
export declare const MINOR_NULL = 22;
export declare const MINOR_UNDEFINED = 23;
/**
 * @param {Uint8Array} _data
 * @param {number} _pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export declare function decodeUndefined(_data: Uint8Array, _pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} _data
 * @param {number} _pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export declare function decodeBreak(_data: Uint8Array, _pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export declare function decodeFloat16(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export declare function decodeFloat32(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export declare function decodeFloat64(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {ByteWriter} writer
 * @param {Token} token
 * @param {EncodeOptions} options
 */
export declare function encodeFloat(writer: ByteWriter, token: Token, options: EncodeOptions): void;
export declare namespace encodeFloat {
    var encodedSize: (token: Token, options: EncodeOptions) => number;
    var compareTokens: (tok1: Token, tok2: Token) => number;
}
//# sourceMappingURL=7float.d.ts.map