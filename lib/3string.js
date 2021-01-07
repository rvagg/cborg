import { Token, Type } from './token.js'
import { assertEnoughData } from './common.js'
import * as uint from './0uint.js'
import { encodeBytes, compareBytes } from './2bytes.js'
import { fromString, toString } from './byte-utils.js'

function toToken (data, pos, prefix, length) {
  assertEnoughData(data, pos, prefix + length)
  const str = toString(data.subarray(pos + prefix, pos + prefix + length))
  return new Token(Type.string, str, prefix + length)
}

export function decodeStringCompact (data, pos, minor, options) {
  return toToken(data, pos, 1, minor)
}

export function decodeString8 (data, pos, minor, options) {
  return toToken(data, pos, 2, uint.readUint8(data, pos + 1, options))
}

export function decodeString16 (data, pos, minor, options) {
  return toToken(data, pos, 3, uint.readUint16(data, pos + 1, options))
}

export function decodeString32 (data, pos, minor, options) {
  return toToken(data, pos, 5, uint.readUint32(data, pos + 1, options))
}

// TODO: maybe we shouldn't support this ..
export function decodeString64 (data, pos, minor, options) {
  return toToken(data, pos, 9, uint.readUint64(data, pos + 1, options))
}

export const encodeString = encodeBytes

encodeString.compareTokens = function compareTokens (tok1, tok2) {
  if (tok1.encodedBytes === undefined) {
    tok1.encodedBytes = fromString(tok1.value)
  }
  if (tok2.encodedBytes === undefined) {
    tok2.encodedBytes = fromString(tok2.value)
  }

  return compareBytes(tok1.encodedBytes, tok2.encodedBytes)
}
