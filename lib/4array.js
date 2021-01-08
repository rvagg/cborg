import { Token, Type } from './token.js'
import * as uint from './0uint.js'
import { decodeErrPrefix } from './common.js'

function toToken (data, pos, prefix, length) {
  return new Token(Type.array, length, prefix)
}

export function decodeArrayCompact (data, pos, minor, options) {
  return toToken(data, pos, 1, minor)
}

export function decodeArray8 (data, pos, minor, options) {
  return toToken(data, pos, 2, uint.readUint8(data, pos + 1, options))
}

export function decodeArray16 (data, pos, minor, options) {
  return toToken(data, pos, 3, uint.readUint16(data, pos + 1, options))
}

export function decodeArray32 (data, pos, minor, options) {
  return toToken(data, pos, 5, uint.readUint32(data, pos + 1, options))
}

// TODO: maybe we shouldn't support this ..
export function decodeArray64 (data, pos, minor, options) {
  return toToken(data, pos, 9, uint.readUint64(data, pos + 1, options))
}

export function decodeArrayIndefinite (data, pos, minor, options) {
  if (options.allowIndefinite === false) {
    throw new Error(`${decodeErrPrefix} indefinite length items not allowed`)
  }
  return toToken(data, pos, 1, Infinity)
}

export function encodeArray (buf, token) {
  const prefixBytes = uint.encodeUintValue(buf, token.value)
  buf.set(0, buf.get(0) | Type.array.majorEncoded) // flip major type
  return prefixBytes
}

// using an array as a map key, are you sure about this? we can only sort
// by map length here, it's up to the encoder to decide to look deeper
encodeArray.compareTokens = uint.encodeUint.compareTokens
