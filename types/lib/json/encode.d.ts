export type EncodeOptions = import("../interface").EncodeOptions;
export type TokenTypeEncoder = import("../interface").TokenTypeEncoder;
export type Token = import("../lib/token").Token;
export type Bl = import("../lib/bl").Bl;
/**
 * @param {any} data
 * @param {EncodeOptions} [options]
 * @returns {Uint8Array}
 */
export function encode(data: any, options?: EncodeOptions): Uint8Array;
//# sourceMappingURL=encode.d.ts.map