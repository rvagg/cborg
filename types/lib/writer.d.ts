/**
 * Byte writers for encoding: FlatWriter, the default, and U8Writer, which writes into a
 * caller-provided Uint8Array.
 */
export type ByteView = import('../interface.js').ByteView;
export type AllocatedByteView = import('../interface.js').AllocatedByteView;
/**
 * FlatWriter is the default encode writer. It appends to one growing Uint8Array
 * rather than a list of chunks. Large byte arrays are held by reference as
 * separate segments and are copied once, by toBytes().
 * toBytes() always returns a new, exact-size Uint8Array, so the result never
 * aliases the writer, its inputs or a Node.js Buffer pool.
 *
 * `pushArr()` takes a `number[]` and `pushBytes()` a `Uint8Array`. Hot call
 * sites use these directly so each stays monomorphic; `push()` dispatches for
 * everyone else.
 */
export declare class FlatWriter {
    home: Uint8Array<ArrayBuffer>;
    buf: Uint8Array<ArrayBuffer>;
    /** @type {number} */
    pos: number;
    /** @type {number} */
    start: number;
    /** @type {Uint8Array[]} */
    segs: Uint8Array[];
    /** @type {number} */
    segLen: number;
    constructor();
    reset(): void;
    /**
     * Make room for `need` more bytes.
     * @param {number} need
     */
    grow(need: number): void;
    /**
     * @param {number} byte
     */
    pushByte(byte: number): void;
    /**
     * @param {number[]} arr
     */
    pushArr(arr: number[]): void;
    /**
     * @param {ByteView} bytes
     */
    pushBytes(bytes: ByteView): void;
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
 * U8Writer writes directly to a user-provided Uint8Array. It has the same
 * interface as FlatWriter but writes to a fixed destination and throws on overflow.
 * @template {ArrayBufferLike} T
 */
export declare class U8Writer<T extends ArrayBufferLike> {
    dest: Uint8Array<T>;
    /** @type {number} */
    cursor: number;
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
     * @param {number[]} bytes
     */
    pushArr(bytes: number[]): void;
    /**
     * @param {ByteView} bytes
     */
    pushBytes(bytes: ByteView): void;
    /**
     * @param {boolean} [reset]
     * @returns {Uint8Array<T>}
     */
    toBytes(reset?: boolean): Uint8Array<T>;
}
//# sourceMappingURL=writer.d.ts.map