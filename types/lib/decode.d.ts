export type Token = import("./token.js").Token;
export type DecodeOptions = import("../interface").DecodeOptions;
export type DecodeTokenizer = import("../interface").DecodeTokenizer;
/**
 * @implements {DecodeTokenizer}
 */
export class Tokeniser implements DecodeTokenizer {
    /**
     * @param {Uint8Array} data
     * @param {DecodeOptions} options
     */
    constructor(data: Uint8Array, options?: DecodeOptions);
    _pos: number;
    data: Uint8Array<ArrayBufferLike>;
    options: import("../interface").DecodeOptions;
    pos(): number;
    done(): boolean;
    next(): import("./token.js").Token;
}
/**
 * @param {DecodeTokenizer} tokeniser
 * @param {DecodeOptions} options
 * @returns {any|BREAK|DONE}
 */
export function tokensToObject(tokeniser: DecodeTokenizer, options: DecodeOptions): any | typeof BREAK | typeof DONE;
/**
 * @param {Uint8Array} data
 * @param {DecodeOptions} [options]
 * @returns {any}
 */
export function decode(data: Uint8Array, options?: DecodeOptions): any;
/**
 * @param {Uint8Array} data
 * @param {DecodeOptions} [options]
 * @returns {[any, Uint8Array]}
 */
export function decodeFirst(data: Uint8Array, options?: DecodeOptions): [any, Uint8Array];
declare const BREAK: unique symbol;
declare const DONE: unique symbol;
export {};
//# sourceMappingURL=decode.d.ts.map