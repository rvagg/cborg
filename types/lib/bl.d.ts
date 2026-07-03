export class Bl {
    /**
     * @param {number} [chunkSize]
     */
    constructor(chunkSize?: number);
    chunkSize: number;
    /** @type {number} */
    cursor: number;
    /** @type {number} */
    maxCursor: number;
    /** @type {(ByteView|number[])[]} */
    chunks: (ByteView | number[])[];
    /** @type {ByteView|number[]|null} */
    _initReuseChunk: ByteView | number[] | null;
    reset(): void;
    /**
     * @param {ByteView|number[]} bytes
     */
    push(bytes: ByteView | number[]): void;
    /**
     * @param {boolean} [reset]
     * @returns {AllocatedByteView}
     */
    toBytes(reset?: boolean): AllocatedByteView;
}
/**
 * U8Bl is a buffer list that writes directly to a user-provided Uint8Array.
 * It provides the same interface as Bl but writes to a fixed destination.
 * @template {ArrayBufferLike} T
 */
export class U8Bl<T extends ArrayBufferLike> {
    /**
     * @param {Uint8Array<T>} dest
     */
    constructor(dest: Uint8Array<T>);
    dest: Uint8Array<T>;
    /** @type {number} */
    cursor: number;
    /** @type {Array<Uint8Array<T>>} */
    chunks: Array<Uint8Array<T>>;
    reset(): void;
    /**
     * @param {ByteView|number[]} bytes
     */
    push(bytes: ByteView | number[]): void;
    /**
     * @param {boolean} [reset]
     * @returns {Uint8Array<T>}
     */
    toBytes(reset?: boolean): Uint8Array<T>;
}
export type ByteView = import("../interface.js").ByteView;
export type AllocatedByteView = import("../interface.js").AllocatedByteView;
//# sourceMappingURL=bl.d.ts.map