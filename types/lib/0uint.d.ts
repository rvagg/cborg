import { Token } from './token.js';
export declare const uintBoundaries: (number | bigint)[];
export type ByteWriter = import('../interface.js').ByteWriter;
export type DecodeOptions = import('../interface.js').DecodeOptions;
/**
 * @typedef {import('../interface.js').ByteWriter} ByteWriter
 * @typedef {import('../interface.js').DecodeOptions} DecodeOptions
 */
/**
 * @param {Uint8Array} data
 * @param {number} offset
 * @param {DecodeOptions} options
 * @returns {number}
 */
export declare function readUint8(data: Uint8Array, offset: number, options: DecodeOptions): number;
/**
 * @param {Uint8Array} data
 * @param {number} offset
 * @param {DecodeOptions} options
 * @returns {number}
 */
export declare function readUint16(data: Uint8Array, offset: number, options: DecodeOptions): number;
/**
 * @param {Uint8Array} data
 * @param {number} offset
 * @param {DecodeOptions} options
 * @returns {number}
 */
export declare function readUint32(data: Uint8Array, offset: number, options: DecodeOptions): number;
/**
 * @param {Uint8Array} data
 * @param {number} offset
 * @param {DecodeOptions} options
 * @returns {number|bigint}
 */
export declare function readUint64(data: Uint8Array, offset: number, options: DecodeOptions): number | bigint;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export declare function decodeUint8(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export declare function decodeUint16(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export declare function decodeUint32(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} _minor
 * @param {DecodeOptions} options
 * @returns {Token}
 */
export declare function decodeUint64(data: Uint8Array, pos: number, _minor: number, options: DecodeOptions): Token;
/**
 * @param {ByteWriter} writer
 * @param {Token} token
 */
export declare function encodeUint(writer: ByteWriter, token: Token): void;
export declare namespace encodeUint {
    var encodedSize: (token: Token) => number;
    var compareTokens: (tok1: Token, tok2: Token) => number;
}
/**
 * @param {ByteWriter} writer
 * @param {number} major
 * @param {number|bigint} uint
 */
export declare function encodeUintValue(writer: ByteWriter, major: number, uint: number | bigint): void;
export declare namespace encodeUintValue {
    var encodedSize: (uint: number) => number;
}
//# sourceMappingURL=0uint.d.ts.map