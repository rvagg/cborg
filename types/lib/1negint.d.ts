/**
 * @typedef {import('../interface').ByteWriter} ByteWriter
 * @typedef {import('../interface').DecodeOptions} DecodeOptions
 */
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeNegint8(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeNegint16(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeNegint32(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeNegint64(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {ByteWriter} writer
 * @param {Token} token
 */
export function encodeNegint(writer: ByteWriter, token: Token): void;
export namespace encodeNegint {
    /**
     * @param {Token} token
     * @returns {number}
     */
    function encodedSize(token: Token): number;
    /**
     * @param {Token} tok1
     * @param {Token} tok2
     * @returns {number}
     */
    function compareTokens(tok1: Token, tok2: Token): number;
}
export type ByteWriter = import("../interface").ByteWriter;
export type DecodeOptions = import("../interface").DecodeOptions;
import { Token } from './token.js';
//# sourceMappingURL=1negint.d.ts.map