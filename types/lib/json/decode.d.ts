import { Token } from '../token.js';
export type DecodeOptions = import('../../interface.js').DecodeOptions;
export type DecodeTokenizer = import('../../interface.js').DecodeTokenizer;
/**
 * @typedef {import('../../interface.js').DecodeOptions} DecodeOptions
 * @typedef {import('../../interface.js').DecodeTokenizer} DecodeTokenizer
 */
/**
 * @implements {DecodeTokenizer}
 */
declare class Tokenizer implements DecodeTokenizer {
    _pos: number;
    data: Uint8Array<ArrayBufferLike>;
    options: import("../../interface.js").DecodeOptions;
    /** @type {string[]} */
    modeStack: string[];
    lastToken: string;
    /**
     * @param {Uint8Array} data
     * @param {DecodeOptions} options
     */
    constructor(data: Uint8Array, options?: DecodeOptions);
    pos(): number;
    /**
     * @returns {boolean}
     */
    done(): boolean;
    /**
     * @returns {number}
     */
    ch(): number;
    /**
     * @returns {string}
     */
    currentMode(): string;
    skipWhitespace(): void;
    /**
     * @param {number[]} str
     */
    expect(str: number[]): void;
    parseNumber(): Token;
    /**
     * @returns {Token}
     */
    parseString(): Token;
    /**
     * @returns {Token}
     */
    parseValue(): Token;
    /**
     * @returns {Token}
     */
    next(): Token;
}
/**
 * @param {Uint8Array} data
 * @param {DecodeOptions} [options]
 * @returns {any}
 */
declare function decode(data: Uint8Array, options?: DecodeOptions): any;
/**
 * @param {Uint8Array} data
 * @param {DecodeOptions} [options]
 * @returns {[any, Uint8Array]}
 */
declare function decodeFirst(data: Uint8Array, options?: DecodeOptions): [any, Uint8Array];
export { decode, decodeFirst, Tokenizer };
//# sourceMappingURL=decode.d.ts.map