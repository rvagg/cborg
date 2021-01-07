/* globals BigInt */

import { Token, Type } from './token.js'
import { decodeErrPrefix, assertEnoughData } from './common.js'

export const uintBoundaries = [24, 2 ** 8, 2 ** 16, 2 ** 32, BigInt(2) ** BigInt(64)]

export function readUint8 (data, pos, options) {
  assertEnoughData(data, pos, 1)
  const value = data[pos]
  if (options.strict === true && value < uintBoundaries[0]) {
    throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
  }
  return value
}

export function readUint16 (data, offset, options) {
  assertEnoughData(data, offset, 2)
  const value = (data[offset] << 8) | data[offset + 1]
  if (options.strict === true && value < uintBoundaries[1]) {
    throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
  }
  return value
}

export function readUint32 (data, offset, options) {
  assertEnoughData(data, offset, 4)
  const value = (data[offset] * 2 ** 24) + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3]
  if (options.strict === true && value < uintBoundaries[2]) {
    throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
  }
  return value
}

export function readUint64 (data, offset, options) {
  // assume BigInt, convert back to Number if within safe range
  assertEnoughData(data, offset, 8)
  const hi = (data[offset] * 2 ** 24) + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3]
  const lo = (data[offset + 4] * 2 ** 24) + (data[offset + 5] << 16) + (data[offset + 6] << 8) + data[offset + 7]
  const value = (BigInt(hi) << BigInt(32)) + BigInt(lo)
  if (options.strict === true && value < uintBoundaries[3]) {
    throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
  }
  if (value <= Number.MAX_SAFE_INTEGER) {
    return Number(value)
  }
  if (options.allowBigInt === true) {
    return value
  }
  throw new Error(`${decodeErrPrefix} integers outside of the safe integer range are not supported`)
}

/* not required thanks to quick[] list
const oneByteTokens = new Array(24).fill(0).map((v, i) => new Token(Type.uint, i, 1))
export function decodeUintCompact (data, pos, minor, options) {
  return oneByteTokens[minor]
}
*/

export function decodeUint8 (data, pos, minor, options) {
  return new Token(Type.uint, readUint8(data, pos + 1, options), 2)
}

export function decodeUint16 (data, pos, minor, options) {
  return new Token(Type.uint, readUint16(data, pos + 1, options), 3)
}

export function decodeUint32 (data, pos, minor, options) {
  return new Token(Type.uint, readUint32(data, pos + 1, options), 5)
}

export function decodeUint64 (data, pos, minor, options) {
  return new Token(Type.uint, readUint64(data, pos + 1, options), 9)
}

export function encodeUint (buf, token) {
  const uint = token.value

  if (uint < uintBoundaries[0]) {
    // pack into one byte, minor=0, additional=value
    buf.set(0, uint)
    return 1
  }

  if (uint < uintBoundaries[1]) {
    // pack into two byte, minor=0, additional=24
    buf.copyTo(0, [24, uint])
    return 2
  }

  if (uint < uintBoundaries[2]) {
    // pack into three byte, minor=0, additional=25
    buf.copyTo(0, [25, uint >>> 8, uint & 0xff])
    return 3
  }

  if (uint < uintBoundaries[3]) {
    // pack into five byte, minor=0, additional=26
    buf.copyTo(0, [26, (uint >>> 24) & 0xff, (uint >>> 16) & 0xff, (uint >>> 8) & 0xff, uint & 0xff])
    return 5
  }

  const buint = BigInt(uint)
  if (buint < uintBoundaries[4]) {
    // pack into nine byte, minor=0, additional=27
    const set = [27, 0, 0, 0, 0, 0, 0, 0]
    // simulate bitwise above 32 bits
    let lo = Number(buint & BigInt(0xffffffff))
    let hi = Number(buint >> BigInt(32) & BigInt(0xffffffff))
    set[8] = lo & 0xff
    lo = lo >> 8
    set[7] = lo & 0xff
    lo = lo >> 8
    set[6] = lo & 0xff
    lo = lo >> 8
    set[5] = lo & 0xff
    set[4] = hi & 0xff
    hi = hi >> 8
    set[3] = hi & 0xff
    hi = hi >> 8
    set[2] = hi & 0xff
    hi = hi >> 8
    set[1] = hi & 0xff
    buf.copyTo(0, set)
    return 9
  }

  throw new Error(`${decodeErrPrefix} encountered BigInt larger than allowable range`)
}

encodeUint.encodedSize = function encodedSize (token) {
  const uint = token.value
  if (uint < uintBoundaries[0]) {
    return 1
  }
  if (uint < uintBoundaries[1]) {
    return 2
  }
  if (uint < uintBoundaries[2]) {
    return 3
  }
  if (uint < uintBoundaries[3]) {
    return 5
  }
  return 9
}

encodeUint.compareTokens = function compareTokens (tok1, tok2) {
  return tok1.value < tok2.value ? -1 : tok1.value > tok2.value ? 1 : /* c8 ignore next */ 0
}
