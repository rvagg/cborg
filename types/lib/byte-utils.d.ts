/**
 * @param {ByteView|number[]} buf
 * @returns {ByteView}
 */
export function asU8A(buf: ByteView | number[]): ByteView;
/**
 * @param {Uint8Array} b1
 * @param {Uint8Array} b2
 * @returns {number}
 */
export function compare(b1: Uint8Array, b2: Uint8Array): number;
/**
 * @param {number[]} codePoints
 * @returns {string}
 */
export function decodeCodePointsArray(codePoints: number[]): string;
export const useBuffer: any;
/**
 * @param {string} string
 */
export function fromString(string: string): any;
export function fromArray(arr: number[]): AllocatedByteView;
/**
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} end
 */
export function slice(bytes: Uint8Array, start: number, end: number): Uint8Array<ArrayBuffer>;
/**
 * @param {ByteView[]} chunks
 * @param {number} length
 * @returns {AllocatedByteView}
 */
export function concat(chunks: ByteView[], length: number): AllocatedByteView;
/**
 * @param {number} size
 * @returns {AllocatedByteView}
 */
export function alloc(size: number): AllocatedByteView;
/**
 * @param {Uint8Array} d
 * @returns {string}
 */
export function toHex(d: Uint8Array): string;
/**
 * @param {string|ByteView} hex
 * @returns {ByteView}
 */
export function fromHex(hex: string | ByteView): ByteView;
export type ByteView = import("../interface.js").ByteView;
export type AllocatedByteView = import("../interface.js").AllocatedByteView;
//# sourceMappingURL=byte-utils.d.ts.map