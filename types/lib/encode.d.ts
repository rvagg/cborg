import { Token } from './token.js';
export type EncodeOptions = import('../interface.js').EncodeOptions;
export type OptionalTypeEncoder = import('../interface.js').OptionalTypeEncoder;
export type Reference = import('../interface.js').Reference;
export type StrictTypeEncoder = import('../interface.js').StrictTypeEncoder;
export type TokenTypeEncoder = import('../interface.js').TokenTypeEncoder;
export type TokenOrNestedTokens = import('../interface.js').TokenOrNestedTokens;
export type ByteWriter = import('../interface.js').ByteWriter;
export type ByteView = import('../interface.js').ByteView;
export type AllocatedByteView = import('../interface.js').AllocatedByteView;
/** @type {EncodeOptions} */
export declare const rfc8949EncodeOptions: EncodeOptions;
/** @returns {TokenTypeEncoder[]} */
export declare function makeCborEncoders(): TokenTypeEncoder[];
/** @implements {Reference} */
declare class Ref implements Reference {
    obj: object | any[];
    parent: import("../interface.js").Reference | undefined;
    /**
     * @param {object|any[]} obj
     * @param {Reference|undefined} parent
     */
    constructor(obj: object | any[], parent: Reference | undefined);
    /**
     * @param {object|any[]} obj
     * @returns {boolean}
     */
    includes(obj: object | any[]): boolean;
    /**
     * @param {Reference|undefined} stack
     * @param {object|any[]} obj
     * @returns {Reference}
     */
    static createCheck(stack: Reference | undefined, obj: object | any[]): Reference;
}
/**
 * @param {any} obj
 * @param {EncodeOptions} [options]
 * @param {Reference} [refStack]
 * @returns {TokenOrNestedTokens}
 */
declare function objectToTokens(obj: any, options?: EncodeOptions, refStack?: Reference): TokenOrNestedTokens;
export type TokenEx = Token & {
    _keyBytes?: AllocatedByteView;
};
declare function encodeCustom<T extends ArrayBufferLike>(data: any, encoders: TokenTypeEncoder[], options: EncodeOptions, destination: Uint8Array<T>): Uint8Array<T>;
declare function encodeCustom(data: any, encoders: TokenTypeEncoder[], options: EncodeOptions): AllocatedByteView;
/**
 * @param {any} data
 * @param {EncodeOptions} [options]
 * @returns {AllocatedByteView}
 */
declare function encode(data: any, options?: EncodeOptions): AllocatedByteView;
/**
 * @template {ArrayBufferLike} T
 * @param {any} data
 * @param {Uint8Array<T>} destination
 * @param {EncodeOptions} [options]
 * @returns {{ written: number }}
 */
declare function encodeInto<T extends ArrayBufferLike>(data: any, destination: Uint8Array<T>, options?: EncodeOptions): {
    written: number;
};
export { objectToTokens, encode, encodeCustom, encodeInto, Ref };
//# sourceMappingURL=encode.d.ts.map