export type DecodeOptions = import("../../interface").DecodeOptions;
export type DecodeTokenizer = import("../../interface").DecodeTokenizer;
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
/**
 * @typedef {import('../../interface').DecodeOptions} DecodeOptions
 * @typedef {import('../../interface').DecodeTokenizer} DecodeTokenizer
 */
/**
 * @implements {DecodeTokenizer}
 */
export class Tokenizer implements DecodeTokenizer {
    /**
     * @param {Uint8Array} data
     * @param {DecodeOptions} options
     */
    constructor(data: Uint8Array, options?: DecodeOptions);
    _pos: number;
    data: Uint8Array<ArrayBufferLike>;
    options: import("../../interface").DecodeOptions;
    /** @type {string[]} */
    modeStack: string[];
    lastToken: string;
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
import { Token } from '../token.js';
//# sourceMappingURL=decode.d.ts.map