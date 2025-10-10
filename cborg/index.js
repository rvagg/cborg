import { encode } from './encode.js'
import { decode, decodeFirst, Tokeniser, tokensToObject } from './decode.js'
import { Token, Type } from 'cborg/utils'

// is this needed for the json module and other independ encoders
export { encodeCustom } from './encode.js'
// export { asU8A, fromString, decodeCodePointsArray } from './utils/byte-utils.js'
// export { quickEncodeToken } from './utils/jump.js'
// export { encodeErrPrefix, decodeErrPrefix } from './lib/common.js'
// export { makeCborEncoders, objectToTokens } from './lib/encode.js'

/**
 * Export the types that were present in the original manual cborg.d.ts
 * @typedef {import('../interface').TagDecoder} TagDecoder
 * There was originally just `TypeEncoder` so don't break types by renaming or not exporting
 * @typedef {import('../interface').OptionalTypeEncoder} TypeEncoder
 * @typedef {import('../interface').DecodeOptions} DecodeOptions
 * @typedef {import('../interface').EncodeOptions} EncodeOptions
 */

export {
  // this is needed to prevent the bundleing trouble which happens
  // due to the fact that token.js is used in lib/json and so in
  // cborg/json which ends up on bundling to have two copies of token.js
  // which will fail stmts like token.type === Type.array
  decode,
  decodeFirst,
  Tokeniser as Tokenizer,
  tokensToObject,
  encode,
  Token,
  Type
}
