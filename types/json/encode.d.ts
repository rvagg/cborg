export type EncodeOptions = import("../interface").EncodeOptions;
export type TokenTypeEncoder = import("../interface").TokenTypeEncoder;
export type Token = import("cborg/utils").Token;
export type Bl = import("cborg/utils").Bl;
/**
 * @param {any} data
 * @param {EncodeOptions} [options]
 * @returns {Uint8Array}
 */
export function encode(data: any, options?: EncodeOptions): Uint8Array;
//# sourceMappingURL=encode.d.ts.map