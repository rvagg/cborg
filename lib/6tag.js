import { Token, Type } from './token.js'
import * as uint from './0uint.js'

export function decodeTagCompact (data, pos, minor, options) {
  return new Token(Type.tag, minor, 1)
}

export function decodeTag8 (data, pos, minor, options) {
  return new Token(Type.tag, uint.readUint8(data, pos + 1, options), 2)
}

export function decodeTag16 (data, pos, minor, options) {
  return new Token(Type.tag, uint.readUint16(data, pos + 1, options), 3)
}

export function decodeTag32 (data, pos, minor, options) {
  return new Token(Type.tag, uint.readUint32(data, pos + 1, options), 5)
}

export function decodeTag64 (data, pos, minor, options) {
  return new Token(Type.tag, uint.readUint64(data, pos + 1, options), 9)
}

export function encodeTag (buf, token) {
  const prefixBytes = uint.encodeUint(buf, new Token(Type.uint, token.value))
  buf.set(0, buf.get(0) | Type.tag.majorEncoded) // flip major type
  return prefixBytes
}

encodeTag.compareTokens = uint.encodeUint.compareTokens
