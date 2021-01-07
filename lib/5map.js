import { Token, Type } from './token.js'
import * as uint from './0uint.js'
import { decodeErrPrefix } from './common.js'

function toToken (data, pos, prefix, length) {
  return new Token(Type.map, length, prefix)
}

export function decodeMapCompact (data, pos, minor, options) {
  return toToken(data, pos, 1, minor)
}

export function decodeMap8 (data, pos, minor, options) {
  return toToken(data, pos, 2, uint.readUint8(data, pos + 1, options))
}

export function decodeMap16 (data, pos, minor, options) {
  return toToken(data, pos, 3, uint.readUint16(data, pos + 1, options))
}

export function decodeMap32 (data, pos, minor, options) {
  return toToken(data, pos, 5, uint.readUint32(data, pos + 1, options))
}

// TODO: maybe we shouldn't support this ..
export function decodeMap64 (data, pos, minor, options) {
  return toToken(data, pos, 9, uint.readUint64(data, pos + 1, options))
}

export function decodeMapIndefinite (data, pos, minor, options) {
  if (options.allowIndefinite === false) {
    throw new Error(`${decodeErrPrefix} indefinite length items not allowed`)
  }
  return toToken(data, pos, 1, Infinity)
}

export function encodeMap (buf, token) {
  const prefixBytes = uint.encodeUint(buf, new Token(Type.uint, token.value))
  buf.set(0, buf.get(0) | Type.map.majorEncoded) // flip major type
  return prefixBytes
}

// using a map as a map key, are you sure about this? we can only sort
// by map length here, it's up to the encoder to decide to look deeper
encodeMap.compareTokens = uint.encodeUint.compareTokens
