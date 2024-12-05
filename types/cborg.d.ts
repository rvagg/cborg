export { encodeCustom } from "./lib/encode.js";
/**
 * There was originally just `TypeEncoder` so don't break types by renaming or not exporting
 */
export type TagDecoder = import("./interface").TagDecoder;
/**
 * Export the types that were present in the original manual cborg.d.ts
 */
export type TypeEncoder = import("./interface").OptionalTypeEncoder;
/**
 * Export the types that were present in the original manual cborg.d.ts
 */
export type DecodeOptions = import("./interface").DecodeOptions;
/**
 * Export the types that were present in the original manual cborg.d.ts
 */
export type EncodeOptions = import("./interface").EncodeOptions;
import { decode } from './lib/decode.js';
import { decodeFirst } from './lib/decode.js';
import { Tokeniser } from './lib/decode.js';
import { tokensToObject } from './lib/decode.js';
import { encode } from './lib/encode.js';
import { Token } from './lib/token.js';
import { Type } from './lib/token.js';
export { decode, decodeFirst, Tokeniser as Tokenizer, tokensToObject, encode, Token, Type };
export { encodeErrPrefix, decodeErrPrefix } from "./lib/common.js";
export { asU8A, fromString, decodeCodePointsArray } from "./lib/byte-utils.js";
//# sourceMappingURL=cborg.d.ts.map