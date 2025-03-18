/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeBytesCompact(data: Uint8Array, pos: number, minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeBytes8(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeBytes16(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeBytes32(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export function decodeBytes64(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Bl} buf
 * @param {Token} token
 * @param {import('../interface.js').EncodeOptions} options
 */
export function encodeBytes(buf: Bl, token: Token, { encodeErrPrefix }: import("../interface.js").EncodeOptions): void;
export namespace encodeBytes {
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
/**
 * @param {Uint8Array} b1
 * @param {Uint8Array} b2
 * @returns {number}
 */
export function compareBytes(b1: Uint8Array, b2: Uint8Array): number;
export type Bl = import("./bl.js").Bl;
export type DecodeOptions = import("../interface.js").DecodeOptions;
import { Token } from './token.js';
//# sourceMappingURL=2bytes.d.ts.map