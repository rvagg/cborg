const { Token, Type } = require('./token')
const {
  decodeErrPrefix,
  encodeErrPrefix,
  assertEnoughData,
  uintMinorPrefixBytes
} = require('./common')

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
    assertEnoughData(data, pos, uintMinorPrefixBytes[27])
    const value = (data[pos + 1] * 2 ** 56) +
      (data[pos + 2] * 2 ** 48) +
      (data[pos + 3] * 2 ** 40) +
      (data[pos + 4] * 2 ** 32) +
      (data[pos + 5] * 2 ** 24) +
      (data[pos + 6] * 2 ** 16) +
      (data[pos + 7] * 2 ** 8) +
      data[pos + 8]
    if (options.strict === true && value < uintBoundaries[3]) {
      throw new Error(`${decodeErrPrefix} integer encoded in more bytes than necessary (strict decode)`)
    }
    return new Token(Type.uint, value, 9)
  }

  throw new Error(`${decodeErrPrefix} unknown minor for this type (${minor})`)
}

const uintBoundaries = [24, 2 ** 8, 2 ** 16, 2 ** 32, 2 ** 64]

function encodeUint (buf, token) {
  const uint = token.value

  if (uint < uintBoundaries[0]) {
    // pack into one byte, minor=0, additional=value
    buf.set(0, uint)
    return 1
  }

  if (uint < uintBoundaries[1]) {
    // pack into two byte, minor=0, additional=24
    buf.set(0, 24)
    buf.set(1, uint)
    return 2
  }

  if (uint < uintBoundaries[2]) {
    // pack into three byte, minor=0, additional=25
    buf.set(0, 25)
    buf.set(1, uint >>> 8)
    buf.set(2, uint & 0xff)
    return 3
  }

  if (uint < uintBoundaries[3]) {
    // pack into five byte, minor=0, additional=26
    buf.set(0, 26)
    buf.set(1, (uint >>> 24) & 0xff)
    buf.set(2, (uint >>> 16) & 0xff)
    buf.set(3, (uint >>> 8) & 0xff)
    buf.set(4, uint & 0xff)
    return 5
  }

  if (uint > Number.MAX_SAFE_INTEGER) {
    throw new Error(`${encodeErrPrefix} number too large to encode (${uint})`)
  }

  if (uint < uintBoundaries[4]) {
    // pack into nine byte, minor=0, additional=27
    buf.set(0, 27)
    // simulate bitwise above 32 bits
    buf.set(1, Math.floor(uint / (2 ** 56)) & 0xff)
    buf.set(2, Math.floor(uint / (2 ** 48)) & 0xff)
    buf.set(3, Math.floor(uint / (2 ** 40)) & 0xff)
    buf.set(4, Math.floor(uint / (2 ** 32)) & 0xff)
    buf.set(5, (uint >>> 24) & 0xff)
    buf.set(6, (uint >>> 16) & 0xff)
    buf.set(7, (uint >>> 8) & 0xff)
    buf.set(8, uint & 0xff)
    return 9
  }

  throw new Error('Shouldn\'t have got here ...')
}

module.exports.decode = decodeUint
module.exports.encode = encodeUint
