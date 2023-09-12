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
    /** @type {(Uint8Array|number[])[]} */
    chunks: (Uint8Array | number[])[];
    /** @type {Uint8Array|number[]|null} */
    _initReuseChunk: Uint8Array | number[] | null;
    reset(): void;
    /**
     * @param {Uint8Array|number[]} bytes
     */
    push(bytes: Uint8Array | number[]): void;
    /**
     * @param {boolean} [reset]
     * @returns {Uint8Array}
     */
    toBytes(reset?: boolean): Uint8Array;
}
/**
 * U8Bl is a buffer list that writes directly to a user-provided Uint8Array.
 * It provides the same interface as Bl but writes to a fixed destination.
 */
export class U8Bl {
    /**
     * @param {Uint8Array} dest
     */
    constructor(dest: Uint8Array);
    dest: Uint8Array<ArrayBufferLike>;
    /** @type {number} */
    cursor: number;
    /** @type {Uint8Array[]} */
    chunks: Uint8Array[];
    reset(): void;
    /**
     * @param {Uint8Array|number[]} bytes
     */
    push(bytes: Uint8Array | number[]): void;
    /**
     * @param {boolean} [reset]
     * @returns {Uint8Array}
     */
    toBytes(reset?: boolean): Uint8Array;
}
//# sourceMappingURL=bl.d.ts.map