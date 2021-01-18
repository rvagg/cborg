import { Token, Type } from './token.js'
import { assertEnoughData } from './common.js'
import * as uint from './0uint.js'
import { encodeBytes } from './2bytes.js'
import { toString } from './byte-utils.js'

function toToken (data, pos, prefix, length) {
  const totLength = prefix + length
  assertEnoughData(data, pos, totLength)
  return new Token(Type.string, toString(data, pos + prefix, pos + totLength), totLength)
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
