import { Token, Type } from './token.js'
import { assertEnoughData } from './common.js'
import * as uint from './0uint.js'
import { compare, fromString, slice } from './byte-utils.js'

function toToken (data, pos, prefix, length) {
  assertEnoughData(data, pos, prefix + length)
  const buf = slice(data, pos + prefix, pos + prefix + length)
  return new Token(Type.bytes, buf, prefix + length)
}

export function decodeBytesCompact (data, pos, minor, options) {
  return toToken(data, pos, 1, minor)
}

export function decodeBytes8 (data, pos, minor, options) {
  return toToken(data, pos, 2, uint.readUint8(data, pos + 1, options))
}

export function decodeBytes16 (data, pos, minor, options) {
  return toToken(data, pos, 3, uint.readUint16(data, pos + 1, options))
}

export function decodeBytes32 (data, pos, minor, options) {
  return toToken(data, pos, 5, uint.readUint32(data, pos + 1, options))
}

// TODO: maybe we shouldn't support this ..
export function decodeBytes64 (data, pos, minor, options) {
  return toToken(data, pos, 9, uint.readUint64(data, pos + 1, options))
}

// `encodedBytes` allows for caching when we do a byte version of a string
// for key sorting purposes
function tokenBytes (token) {
  if (token.encodedBytes === undefined) {
    if (typeof token.value === 'string') {
      token.encodedBytes = fromString(token.value)
      return token.encodedBytes
    }
    return token.value
  }
  return token.encodedBytes
}

export function encodeBytes (buf, token) {
  const bytes = tokenBytes(token)
  const prefixBytes = uint.encodeUintValue(buf, bytes.length)
  buf.set(0, buf.get(0) | token.type.majorEncoded) // flip major type
  buf.copyTo(prefixBytes, bytes)
  return prefixBytes + bytes.length
}

encodeBytes.encodedSize = function encodedSize (token) {
  const bytes = tokenBytes(token)
  return uint.encodeUintValue.encodedSize(bytes.length) + bytes.length
}

encodeBytes.compareTokens = function compareTokens (tok1, tok2) {
  return compareBytes(tok1.value, tok2.value)
}

export function compareBytes (b1, b2) {
  if (b1.length < b2.length) {
    return -1
  }

  if (b1.length > b2.length) {
    return 1
  }

  return compare(b1, b2)
}
