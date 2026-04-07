import { encode, encodeInto, objectToTokens, rfc8949EncodeOptions } from './lib/encode.js'
import { decode, decodeFirst, Tokeniser, tokensToObject } from './lib/decode.js'
import { Tagged } from './lib/tagged.js'
import { Token, Type } from './lib/token.js'

/**
 * Export the types that were present in the original manual cborg.d.ts
 * @typedef {import('./interface.js').TagDecodeControl} TagDecodeControl
 * @typedef {import('./interface.js').TagDecoder} TagDecoder
 * There was originally just `TypeEncoder` so don't break types by renaming or not exporting
 * @typedef {import('./interface.js').OptionalTypeEncoder} TypeEncoder
 * @typedef {import('./interface.js').DecodeOptions} DecodeOptions
 * @typedef {import('./interface.js').EncodeOptions} EncodeOptions
 */

export {
  decode,
  decodeFirst,
  Tokeniser as Tokenizer,
  tokensToObject,
  encode,
  encodeInto,
  objectToTokens,
  rfc8949EncodeOptions,
  Tagged,
  Token,
  Type
}
