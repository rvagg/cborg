declare const decodeErrPrefix = "CBOR decode error:";
declare const encodeErrPrefix = "CBOR encode error:";
declare const uintMinorPrefixBytes: any[];
/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} need
 */
declare function assertEnoughData(data: Uint8Array, pos: number, need: number): void;
export { decodeErrPrefix, encodeErrPrefix, uintMinorPrefixBytes, assertEnoughData };
//# sourceMappingURL=common.d.ts.map