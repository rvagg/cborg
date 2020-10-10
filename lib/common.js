const decodeErrPrefix = 'CBOR decode error:'
const encodeErrPrefix = 'CBOR encode error:'

const uintMinorPrefixBytes = []
uintMinorPrefixBytes[23] = 1
uintMinorPrefixBytes[24] = 2
uintMinorPrefixBytes[25] = 3
uintMinorPrefixBytes[26] = 5
uintMinorPrefixBytes[27] = 9

function assertEnoughData (data, pos, need) {
  if (data.length - pos < need) {
    throw new Error(`${decodeErrPrefix} not enough data for type`)
  }
}

function toHex (d) {
  if (typeof d === 'string') {
    return d
  }
  return Array.prototype.reduce.call(d, (p, c) => `${p}${c.toString(16).padStart(2, '0')}`, '')
}

function fromHex (hex) {
  if (hex instanceof Uint8Array) {
    return hex
  }
  if (!hex.length) {
    return new Uint8Array(0)
  }
  return new Uint8Array(hex.split('')
    .map((c, i, d) => i % 2 === 0 ? `0x${c}${d[i + 1]}` : '')
    .filter(Boolean)
    .map((e) => parseInt(e, 16)))
}

export {
  decodeErrPrefix,
  encodeErrPrefix,
  uintMinorPrefixBytes,
  assertEnoughData,
  toHex,
  fromHex
}
