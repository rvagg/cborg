export { encodeCustom } from "./encode.js";
/**
 * There was originally just `TypeEncoder` so don't break types by renaming or not exporting
 */
export type TagDecoder = import("../interface").TagDecoder;
/**
 * Export the types that were present in the original manual cborg.d.ts
 */
export type TypeEncoder = import("../interface").OptionalTypeEncoder;
/**
 * Export the types that were present in the original manual cborg.d.ts
 */
export type DecodeOptions = import("../interface").DecodeOptions;
/**
 * Export the types that were present in the original manual cborg.d.ts
 */
export type EncodeOptions = import("../interface").EncodeOptions;
import { decode } from './decode.js';
import { decodeFirst } from './decode.js';
import { Tokeniser } from './decode.js';
import { tokensToObject } from './decode.js';
import { encode } from './encode.js';
import { Token } from 'cborg/utils';
import { Type } from 'cborg/utils';
export { decode, decodeFirst, Tokeniser as Tokenizer, tokensToObject, encode, Token, Type };
//# sourceMappingURL=index.d.ts.map