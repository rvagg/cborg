export type CidPart = {
    start: number;
    end: number;
    label: string;
};
export type CidInfo = {
    version: 0 | 1;
    codec: number;
    hash: number;
    digest: Uint8Array;
    /**
     * base58btc for v0, multibase base32 for v1
     */
    string: string;
    /**
     * byte ranges of the tag content, in order
     */
    parts: CidPart[];
};
/**
 * @param {number|bigint} tag
 * @returns {string|undefined}
 */
declare function tagName(tag: number | bigint): string | undefined;
/**
 * Read an unsigned varint as specified by multiformats: at most 9 bytes,
 * minimally encoded.
 * https://github.com/multiformats/unsigned-varint
 *
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @returns {[number, number]} value and the number of bytes read
 */
declare function readVarint(bytes: Uint8Array, offset: number): [number, number];
/**
 * RFC 4648 section 6 base32, lower case, unpadded.
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
declare function toBase32(bytes: Uint8Array): string;
/**
 * Bitcoin base58. Quadratic in input length, which is fine for a multihash.
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
declare function toBase58btc(bytes: Uint8Array): string;
/**
 * Describe the content of a tag 42: a 0x00 multibase prefix followed by a
 * binary CID.
 * https://ipld.io/specs/codecs/dag-cbor/spec/#links
 * https://github.com/multiformats/cid
 *
 * @param {Uint8Array} bytes
 * @returns {CidInfo}
 */
declare function decodeCid(bytes: Uint8Array): CidInfo;
/**
 * The integer a tag 2 or 3 bignum stands for (RFC 8949 section 3.4.3).
 *
 * @param {2|3} tag
 * @param {Uint8Array} bytes
 * @returns {bigint}
 */
declare function bignum(tag: 2 | 3, bytes: Uint8Array): bigint;
/**
 * The instant a tag 1 epoch date stands for (RFC 8949 section 3.4.2), or
 * undefined when it is outside the range a Date can hold.
 *
 * @param {number|bigint} seconds
 * @returns {string|undefined}
 */
declare function epochDate(seconds: number | bigint): string | undefined;
export { tagName, readVarint, toBase32, toBase58btc, decodeCid, bignum, epochDate };
//# sourceMappingURL=diagnostic-tags.d.ts.map