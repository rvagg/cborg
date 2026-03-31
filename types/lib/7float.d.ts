/**
 * @param {Uint8Array} _data
 * @param {number} _pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeUndefined(_data: Uint8Array, _pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} _data
 * @param {number} _pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeBreak(_data: Uint8Array, _pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeFloat16(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeFloat32(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeFloat64(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {ByteWriter} writer
 * @param {Token} token
 * @param {EncodeOptions} options
 */
export function encodeFloat(writer: ByteWriter, token: Token, options: EncodeOptions): void;
export namespace encodeFloat {
    /**
     * @param {Token} token
     * @param {EncodeOptions} options
     * @returns {number}
     */
    function encodedSize(token: Token, options: EncodeOptions): number;
    let compareTokens: (tok1: Token, tok2: Token) => number;
}
/**
 * @typedef {import('../interface.js').ByteWriter} ByteWriter
 * @typedef {import('../interface.js').DecodeOptions} DecodeOptions
 * @typedef {import('../interface.js').EncodeOptions} EncodeOptions
 */
export const MINOR_FALSE: 20;
export const MINOR_TRUE: 21;
export const MINOR_NULL: 22;
export const MINOR_UNDEFINED: 23;
export type ByteWriter = import("../interface.js").ByteWriter;
export type DecodeOptions = import("../interface.js").DecodeOptions;
export type EncodeOptions = import("../interface.js").EncodeOptions;
import { Token } from './token.js';
//# sourceMappingURL=7float.d.ts.map