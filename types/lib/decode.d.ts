export type Token = import('./token.js').Token;
export type DecodeOptions = import('../interface.js').DecodeOptions;
export type DecodeTokenizer = import('../interface.js').DecodeTokenizer;
export type TagDecodeControl = import('../interface.js').TagDecodeControl;
/**
 * @implements {DecodeTokenizer}
 */
declare class Tokeniser implements DecodeTokenizer {
    _pos: number;
    data: Uint8Array<ArrayBufferLike>;
    options: import("../interface.js").DecodeOptions;
    /**
     * @param {Uint8Array} data
     * @param {DecodeOptions} options
     */
    constructor(data: Uint8Array, options?: DecodeOptions);
    pos(): number;
    done(): boolean;
    next(): import("./token.js").Token;
}
declare const DONE: unique symbol;
declare const BREAK: unique symbol;
/**
 * @param {DecodeTokenizer} tokeniser
 * @param {DecodeOptions} options
 * @returns {any|typeof BREAK|typeof DONE}
 */
declare function tokensToObject(tokeniser: DecodeTokenizer, options: DecodeOptions): any | typeof BREAK | typeof DONE;
/**
 * @param {Uint8Array} data
 * @param {DecodeOptions} [options]
 * @returns {[any, Uint8Array]}
 */
declare function decodeFirst(data: Uint8Array, options?: DecodeOptions): [any, Uint8Array];
/**
 * @param {Uint8Array} data
 * @param {DecodeOptions} [options]
 * @returns {any}
 */
declare function decode(data: Uint8Array, options?: DecodeOptions): any;
export { Tokeniser, tokensToObject, decode, decodeFirst };
//# sourceMappingURL=decode.d.ts.map