export declare const useBuffer: any;
export type ByteView = import('../interface.js').ByteView;
export type AllocatedByteView = import('../interface.js').AllocatedByteView;
/**
 * @param {ByteView|number[]} buf
 * @returns {ByteView}
 */
export declare function asU8A(buf: ByteView | number[]): ByteView;
export declare const fromString: (string: string) => any;
/**
 * Buffer variant not fast enough for what we need
 * @param {number[]} arr
 * @returns {AllocatedByteView}
 */
export declare const fromArray: (arr: number[]) => AllocatedByteView;
export declare const slice: (bytes: Uint8Array, start: number, end: number) => Uint8Array<ArrayBuffer>;
export declare const concat: (chunks: ByteView[], length: number) => AllocatedByteView;
export declare const alloc: (size: number) => AllocatedByteView;
export declare const toHex: (d: Uint8Array) => string;
export declare const fromHex: (hex: string | ByteView) => ByteView;
/**
 * @param {Uint8Array} b1
 * @param {Uint8Array} b2
 * @returns {number}
 */
export declare function compare(b1: Uint8Array, b2: Uint8Array): number;
/**
 * @param {number[]} codePoints
 * @returns {string}
 */
export declare function decodeCodePointsArray(codePoints: number[]): string;
//# sourceMappingURL=byte-utils.d.ts.map