const decoders = []
const errPrefix = 'CBOR decode error:'

const uintMinorPrefixBytes = []
uintMinorPrefixBytes[23] = 1
uintMinorPrefixBytes[24] = 2
uintMinorPrefixBytes[25] = 3
uintMinorPrefixBytes[26] = 5
uintMinorPrefixBytes[27] = 9

decoders[0] = function decodeUint (data, pos, minor) {
  if (minor <= 23) {
    return minor
  }

  if (minor === 24) { // uint8
    assertEnoughData(data, pos, uintMinorPrefixBytes[24])
    return data[pos + 1]
  }

  if (minor === 25) { // uint16
    assertEnoughData(data, pos, uintMinorPrefixBytes[25])
    return (data[pos + 1] * 2 ** 8) + data[pos + 2]
  }

  if (minor === 26) { // uint32
    assertEnoughData(data, pos, uintMinorPrefixBytes[26])
    return (data[pos + 1] * 2 ** 24) + (data[pos + 2] * 2 ** 16) + (data[pos + 3] * 2 ** 8) + data[pos + 4]
  }

  if (minor === 27) { // uint64
    assertEnoughData(data, pos, uintMinorPrefixBytes[27])
    return (data[pos + 1] * 2 ** 56) +
      (data[pos + 2] * 2 ** 48) +
      (data[pos + 3] * 2 ** 40) +
      (data[pos + 4] * 2 ** 32) +
      (data[pos + 5] * 2 ** 24) +
      (data[pos + 6] * 2 ** 16) +
      (data[pos + 7] * 2 ** 8) +
      data[pos + 8]
  }

  throw new Error(`${errPrefix} unknown minor for this type (${minor})`)
}

decoders[1] = function decodeNegint (data, pos, minor) {
  const uint = decoders[0](data, pos, minor) // decode uint
  return -1 - uint
}

decoders[2] = function decodeBytes (data, pos, minor) {
  const length = decoders[0](data, pos, minor) // decode uint
  const pfxBytes = uintMinorPrefixBytes[minor <= 23 ? 23 : minor]
  assertEnoughData(data, pos, pfxBytes + length)
  return data.slice(pos + pfxBytes, pos + pfxBytes + length)
}

decoders[3] = function decodeString (data, pos, minor) {
  // utf8Slice from https://github.com/feross/buffer/blob/master/index.js for browser
  throw new Error('unimplemented')
}

function assertEnoughData (data, pos, need) {
  if (data.length - pos < need) {
    throw new Error(`${errPrefix} not enough data for type`)
  }
}

function decode (data) {
  const pos = 0

  const major = data[0] >>> 5
  const minor = data[0] & 31

  const decoder = decoders[major]
  if (!decoder) {
    throw new Error(`${errPrefix} no decoder for major type ${major}`)
  }

  return decoder(data, pos, minor)
}

module.exports.decode = decode
