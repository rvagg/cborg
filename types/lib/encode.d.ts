/** @returns {TokenTypeEncoder[]} */
export function makeCborEncoders(): TokenTypeEncoder[];
/** @type {EncodeOptions} */
export const rfc8949EncodeOptions: EncodeOptions;
export type TokenEx = Token & {
    _keyBytes?: AllocatedByteView;
};
export type EncodeOptions = import("../interface.js").EncodeOptions;
export type OptionalTypeEncoder = import("../interface.js").OptionalTypeEncoder;
export type Reference = import("../interface.js").Reference;
export type StrictTypeEncoder = import("../interface.js").StrictTypeEncoder;
export type TokenTypeEncoder = import("../interface.js").TokenTypeEncoder;
export type TokenOrNestedTokens = import("../interface.js").TokenOrNestedTokens;
export type ByteWriter = import("../interface.js").ByteWriter;
export type ByteView = import("../interface.js").ByteView;
export type AllocatedByteView = import("../interface.js").AllocatedByteView;
/**
 * @param {any} obj
 * @param {EncodeOptions} [options]
 * @param {Reference} [refStack]
 * @returns {TokenOrNestedTokens}
 */
export function objectToTokens(obj: any, options?: EncodeOptions, refStack?: Reference): TokenOrNestedTokens;
/**
 * @param {any} data
 * @param {EncodeOptions} [options]
 * @returns {AllocatedByteView}
 */
export function encode(data: any, options?: EncodeOptions): AllocatedByteView;
/**
 * @template {ArrayBufferLike} T
 * @overload
 * @param {any} data
 * @param {TokenTypeEncoder[]} encoders
 * @param {EncodeOptions} options
 * @param {Uint8Array<T>} destination
 * @returns {Uint8Array<T>}
 */
export function encodeCustom<T extends ArrayBufferLike>(data: any, encoders: TokenTypeEncoder[], options: EncodeOptions, destination: Uint8Array<T>): Uint8Array<T>;
/**
 * @overload
 * @param {any} data
 * @param {TokenTypeEncoder[]} encoders
 * @param {EncodeOptions} options
 * @returns {AllocatedByteView}
 */
export function encodeCustom(data: any, encoders: TokenTypeEncoder[], options: EncodeOptions): AllocatedByteView;
/**
 * @template {ArrayBufferLike} T
 * @param {any} data
 * @param {Uint8Array<T>} destination
 * @param {EncodeOptions} [options]
 * @returns {{ written: number }}
 */
export function encodeInto<T extends ArrayBufferLike>(data: any, destination: Uint8Array<T>, options?: EncodeOptions): {
    written: number;
};
/** @implements {Reference} */
export class Ref implements Reference {
    /**
     * @param {Reference|undefined} stack
     * @param {object|any[]} obj
     * @returns {Reference}
     */
    static createCheck(stack: Reference | undefined, obj: object | any[]): Reference;
    /**
     * @param {object|any[]} obj
     * @param {Reference|undefined} parent
     */
    constructor(obj: object | any[], parent: Reference | undefined);
    obj: object | any[];
    parent: import("../interface.js").Reference | undefined;
    /**
     * @param {object|any[]} obj
     * @returns {boolean}
     */
    includes(obj: object | any[]): boolean;
}
import { Token } from './token.js';
//# sourceMappingURL=encode.d.ts.map