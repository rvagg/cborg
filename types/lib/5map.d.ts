/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} minor
 * @param {DecodeOptions} _options
 * @returns {Token}
 */
export function decodeMapCompact(data: Uint8Array, pos: number, minor: number, _options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeMap8(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeMap16(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeMap32(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeMap64(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeMapIndefinite(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {ByteWriter} writer
 * @param {Token} token
 */
export function encodeMap(writer: ByteWriter, token: Token): void;
export namespace encodeMap {
    let compareTokens: (tok1: Token, tok2: Token) => number;
    /**
     * @param {Token} token
     * @returns {number}
     */
    function encodedSize(token: Token): number;
}
export type ByteWriter = import("../interface").ByteWriter;
export type DecodeOptions = import("../interface").DecodeOptions;
import { Token } from './token.js';
//# sourceMappingURL=5map.d.ts.map