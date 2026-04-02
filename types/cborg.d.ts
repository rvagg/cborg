/**
 * Export the types that were present in the original manual cborg.d.ts
 */
export type TagDecodeControl = import("./interface.js").TagDecodeControl;
/**
 * There was originally just `TypeEncoder` so don't break types by renaming or not exporting
 */
export type TagDecoder = import("./interface.js").TagDecoder;
/**
 * Export the types that were present in the original manual cborg.d.ts
 */
export type TypeEncoder = import("./interface.js").OptionalTypeEncoder;
/**
 * Export the types that were present in the original manual cborg.d.ts
 */
export type DecodeOptions = import("./interface.js").DecodeOptions;
/**
 * Export the types that were present in the original manual cborg.d.ts
 */
export type EncodeOptions = import("./interface.js").EncodeOptions;
import { decode } from './lib/decode.js';
import { decodeFirst } from './lib/decode.js';
import { Tokeniser } from './lib/decode.js';
import { tokensToObject } from './lib/decode.js';
import { encode } from './lib/encode.js';
import { encodeInto } from './lib/encode.js';
import { rfc8949EncodeOptions } from './lib/encode.js';
import { Token } from './lib/token.js';
import { Type } from './lib/token.js';
export { decode, decodeFirst, Tokeniser as Tokenizer, tokensToObject, encode, encodeInto, rfc8949EncodeOptions, Token, Type };
//# sourceMappingURL=cborg.d.ts.map