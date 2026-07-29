/**
 * Bl is a list of byte chunks, similar to https://github.com/rvagg/bl but for
 * writing rather than reading.
 * A Bl object accepts set() operations for individual bytes and copyTo() for
 * inserting byte arrays. These write operations don't automatically increment
 * the internal cursor so its "length" won't be changed. Instead, increment()
 * must be called to extend its length to cover the inserted data.
 * The toBytes() call will convert all internal memory to a single Uint8Array of
 * the correct length, truncating any data that is stored but hasn't been
 * included by an increment().
 * get() can retrieve a single byte.
 * All operations (except toBytes()) take an "offset" argument that will perform
 * the write at the offset _from the current cursor_. For most operations this
 * will be `0` to write at the current cursor position but it can be ahead of
 * the current cursor. Negative offsets probably work but are untested.
 */
export type ByteView = import('../interface.js').ByteView;
export type AllocatedByteView = import('../interface.js').AllocatedByteView;
export declare class Bl {
    chunkSize: number;
    /** @type {number} */
    cursor: number;
    /** @type {number} */
    maxCursor: number;
    /** @type {(ByteView|number[])[]} */
    chunks: (ByteView | number[])[];
    /** @type {ByteView|number[]|null} */
    _initReuseChunk: ByteView | number[] | null;
    /**
     * @param {number} [chunkSize]
     */
    constructor(chunkSize?: number);
    reset(): void;
    /**
     * @param {number} byte
     */
    pushByte(byte: number): void;
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
export declare class U8Bl<T extends ArrayBufferLike> {
    dest: Uint8Array<T>;
    /** @type {number} */
    cursor: number;
    /** @type {Array<Uint8Array<T>>} */
    chunks: Array<Uint8Array<T>>;
    /**
     * @param {Uint8Array<T>} dest
     */
    constructor(dest: Uint8Array<T>);
    reset(): void;
    /**
     * @param {number} byte
     */
    pushByte(byte: number): void;
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
//# sourceMappingURL=bl.d.ts.map