/* globals BigInt */

import { Token, Type } from './token.js'
import {
  decodeErrPrefix,
  assertEnoughData,
  uintMinorPrefixBytes
} from './common.js'

function decodeUint (data, pos, minor, options) {
  if (minor <= 23) {
    return new Token(Type.uint, minor, 1)
  }

  if (minor === 24) { // uint8
    assertEnoughData(data, pos, uintMinorPrefixBytes[24])
    const value = data[pos + 1]
    if (options.strict === true && value < uintBoundaries[0]) {
      throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
    }
    return new Token(Type.uint, value, 2)
  }

  if (minor === 25) { // uint16
    assertEnoughData(data, pos, uintMinorPrefixBytes[25])
    const value = (data[pos + 1] * 2 ** 8) + data[pos + 2]
    if (options.strict === true && value < uintBoundaries[1]) {
      throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
    }
    return new Token(Type.uint, value, 3)
  }

  if (minor === 26) { // uint32
    assertEnoughData(data, pos, uintMinorPrefixBytes[26])
    const value = (data[pos + 1] * 2 ** 24) + (data[pos + 2] * 2 ** 16) + (data[pos + 3] * 2 ** 8) + data[pos + 4]
    if (options.strict === true && value < uintBoundaries[2]) {
      throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
    }
    return new Token(Type.uint, value, 5)
  }

  if (minor === 27) { // uint64
    // assume BigInt, convert back to Number if within safe range
    assertEnoughData(data, pos, uintMinorPrefixBytes[27])
    const value = (BigInt(data[pos + 1] * 2 ** 56)) +
      (BigInt(data[pos + 2] * 2 ** 48)) +
      (BigInt(data[pos + 3] * 2 ** 40)) +
      (BigInt(data[pos + 4] * 2 ** 32)) +
      (BigInt(data[pos + 5] * 2 ** 24)) +
      (BigInt(data[pos + 6] * 2 ** 16)) +
      (BigInt(data[pos + 7] * 2 ** 8)) +
      BigInt(data[pos + 8])
    if (options.strict === true && value < uintBoundaries[3]) {
      throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
    }
    return new Token(Type.uint, value <= Number.MAX_SAFE_INTEGER ? Number(value) : value, 9)
  }

  /*
   if (minor === 31) {
     return new Token(Type.indefiniteLength, undefined, 1)
  }
  */

  throw new Error(`${decodeErrPrefix} unknown minor for this type (${minor})`)
}

const uintBoundaries = [24, 2 ** 8, 2 ** 16, 2 ** 32, BigInt(2) ** BigInt(64)]

function encodeUint (buf, token) {
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
  } /* c8 ignore next 2 */

  throw new Error('Shouldn\'t have got here ...')
}

encodeUint.compareTokens = function compareTokens (tok1, tok2) {
  return tok1.value < tok2.value ? -1 : tok1.value > tok2.value ? 1 : /* c8 ignore next */ 0
}

export { decodeUint as decode, encodeUint as encode }
