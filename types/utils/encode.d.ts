/**
 * @typedef {import('../interface').EncodeOptions} EncodeOptions
 * @typedef {import('../interface').OptionalTypeEncoder} OptionalTypeEncoder
 * @typedef {import('../interface').Reference} Reference
 * @typedef {import('../interface').StrictTypeEncoder} StrictTypeEncoder
 * @typedef {import('../interface').TokenTypeEncoder} TokenTypeEncoder
 * @typedef {import('../interface').TokenOrNestedTokens} TokenOrNestedTokens
 */
/**
 * @param {any} data
 * @param {TokenTypeEncoder[]} encoders
 * @param {EncodeOptions} options
 * @returns {Uint8Array}
 */
declare function encodeCustom(data: any, encoders: TokenTypeEncoder[], options: EncodeOptions): Uint8Array;
type EncodeOptions = import("../interface").EncodeOptions;
type OptionalTypeEncoder = import("../interface").OptionalTypeEncoder;
type Reference = import("../interface").Reference;
type StrictTypeEncoder = import("../interface").StrictTypeEncoder;
type TokenTypeEncoder = import("../interface").TokenTypeEncoder;
type TokenOrNestedTokens = import("../interface").TokenOrNestedTokens;
//# sourceMappingURL=encode.d.ts.map