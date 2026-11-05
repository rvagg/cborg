// Tag and CID descriptions for diagnostic output. Display only: nothing here
// takes part in decoding.

/** @typedef {{ start: number, end: number, label: string }} CidPart */
/**
 * @typedef {object} CidInfo
 * @property {0|1} version
 * @property {number} codec
 * @property {number} hash
 * @property {Uint8Array} digest
 * @property {string} string base58btc for v0, multibase base32 for v1
 * @property {CidPart[]} parts byte ranges of the tag content, in order
 */

// https://www.iana.org/assignments/cbor-tags/cbor-tags.xhtml
/** @type {Record<number, string>} */
const tagNames = {
  0: 'date/time string',
  1: 'epoch date',
  2: 'unsigned bignum',
  3: 'negative bignum',
  4: 'decimal fraction',
  5: 'bigfloat',
  21: 'expected base64url',
  22: 'expected base64',
  23: 'expected base16',
  24: 'embedded CBOR',
  27: 'serialised object',
  32: 'URI',
  33: 'base64url',
  34: 'base64',
  36: 'MIME message',
  42: 'CID',
  64: 'uint8 array',
  65: 'uint16 BE array',
  66: 'uint32 BE array',
  67: 'uint64 BE array',
  68: 'uint8 clamped array',
  69: 'uint16 LE array',
  70: 'uint32 LE array',
  71: 'uint64 LE array',
  72: 'sint8 array',
  73: 'sint16 BE array',
  74: 'sint32 BE array',
  75: 'sint64 BE array',
  77: 'sint16 LE array',
  78: 'sint32 LE array',
  79: 'sint64 LE array',
  80: 'float16 BE array',
  81: 'float32 BE array',
  82: 'float64 BE array',
  83: 'float128 BE array',
  84: 'float16 LE array',
  85: 'float32 LE array',
  86: 'float64 LE array',
  87: 'float128 LE array',
  258: 'set',
  259: 'map',
  21066: 'RegExp',
  55799: 'self-described CBOR'
}

// https://github.com/multiformats/multicodec/blob/master/table.csv
/** @type {Record<number, string>} */
const codecNames = {
  0x51: 'cbor',
  0x55: 'raw',
  0x70: 'dag-pb',
  0x71: 'dag-cbor',
  0x72: 'libp2p-key',
  0x78: 'git-raw',
  0x85: 'dag-jose',
  0x0129: 'dag-json',
  0x0200: 'json',
  0xf101: 'fil-commitment-unsealed',
  0xf102: 'fil-commitment-sealed'
}

/** @type {Record<number, string>} */
const hashNames = {
  0x00: 'identity',
  0x11: 'sha1',
  0x12: 'sha2-256',
  0x13: 'sha2-512',
  0x16: 'sha3-256',
  0x1b: 'keccak-256',
  0x1e: 'blake3',
  0x1012: 'sha2-256-trunc254-padded',
  0xb220: 'blake2b-256',
  0xb401: 'poseidon-bls12_381-a2-fc1'
}

const base32Alphabet = 'abcdefghijklmnopqrstuvwxyz234567'
const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * @param {number|bigint} tag
 * @returns {string|undefined}
 */
function tagName (tag) {
  return typeof tag === 'number' ? tagNames[tag] : undefined
}

/**
 * Read an unsigned varint as specified by multiformats: at most 9 bytes,
 * minimally encoded.
 * https://github.com/multiformats/unsigned-varint
 *
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @returns {[number, number]} value and the number of bytes read
 */
function readVarint (bytes, offset) {
  let value = 0
  for (let i = 0; i < 9; i++) {
    if (offset + i >= bytes.length) {
      throw new Error('truncated varint')
    }
    const byte = bytes[offset + i]
    value += (byte & 0x7f) * 2 ** (7 * i)
    if (byte < 0x80) {
      if (byte === 0 && i > 0) {
        throw new Error('varint is not minimally encoded')
      }
      if (!Number.isSafeInteger(value)) {
        throw new Error('varint is too large')
      }
      return [value, i + 1]
    }
  }
  throw new Error('varint is longer than 9 bytes')
}

/**
 * RFC 4648 section 6 base32, lower case, unpadded.
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function toBase32 (bytes) {
  let out = ''
  let bits = 0
  let buffer = 0
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += base32Alphabet[(buffer >>> bits) & 31]
    }
    buffer &= (1 << bits) - 1
  }
  if (bits > 0) {
    out += base32Alphabet[(buffer << (5 - bits)) & 31]
  }
  return out
}

/**
 * Bitcoin base58. Quadratic in input length, which is fine for a multihash.
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function toBase58btc (bytes) {
  /** @type {number[]} */
  const digits = [] // least significant first
  for (const byte of bytes) {
    let carry = byte
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8
      digits[i] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }
  let out = ''
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    out += '1'
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    out += base58Alphabet[digits[i]]
  }
  return out
}

/**
 * @param {Record<number, string>} names
 * @param {number} code
 * @returns {string}
 */
function codeName (names, code) {
  return names[code] || `0x${code.toString(16)}`
}

/**
 * Describe the content of a tag 42: a 0x00 multibase prefix followed by a
 * binary CID.
 * https://ipld.io/specs/codecs/dag-cbor/spec/#links
 * https://github.com/multiformats/cid
 *
 * @param {Uint8Array} bytes
 * @returns {CidInfo}
 */
function decodeCid (bytes) {
  if (bytes.length === 0 || bytes[0] !== 0x00) {
    throw new Error('missing 0x00 multibase prefix')
  }
  /** @type {CidPart[]} */
  const parts = [{ start: 0, end: 1, label: 'multibase prefix' }]

  // a bare sha2-256 multihash; a v1 CID starts with version 0x01
  if (bytes[1] === 0x12) {
    if (bytes.length !== 35 || bytes[2] !== 0x20) {
      throw new Error('CIDv0 must be a 34 byte sha2-256 multihash')
    }
    parts.push(
      { start: 1, end: 2, label: 'hash(sha2-256)' },
      { start: 2, end: 3, label: 'length(32)' },
      { start: 3, end: 35, label: 'digest' }
    )
    const multihash = bytes.subarray(1)
    return { version: 0, codec: 0x70, hash: 0x12, digest: bytes.subarray(3), string: toBase58btc(multihash), parts }
  }

  let offset = 1
  /**
   * @param {(value: number) => string} label
   * @returns {number}
   */
  const field = (label) => {
    const [value, length] = readVarint(bytes, offset)
    parts.push({ start: offset, end: offset + length, label: label(value) })
    offset += length
    return value
  }
  const version = field((v) => `version(${v})`)
  if (version !== 1) {
    throw new Error(`unsupported CID version ${version}`)
  }
  const codec = field((c) => `codec(${codeName(codecNames, c)})`)
  const hash = field((h) => `hash(${codeName(hashNames, h)})`)
  const length = field((l) => `length(${l})`)
  if (length !== bytes.length - offset) {
    throw new Error(`digest length ${length} does not match the ${bytes.length - offset} bytes that follow`)
  }
  parts.push({ start: offset, end: bytes.length, label: 'digest' })
  return {
    version: 1,
    codec,
    hash,
    digest: bytes.subarray(offset),
    string: `b${toBase32(bytes.subarray(1))}`,
    parts
  }
}

/**
 * The integer a tag 2 or 3 bignum stands for (RFC 8949 section 3.4.3).
 *
 * @param {2|3} tag
 * @param {Uint8Array} bytes
 * @returns {bigint}
 */
function bignum (tag, bytes) {
  let n = 0n
  for (const byte of bytes) {
    n = (n << 8n) | BigInt(byte)
  }
  return tag === 2 ? n : -1n - n
}

/**
 * The instant a tag 1 epoch date stands for (RFC 8949 section 3.4.2), or
 * undefined when it is outside the range a Date can hold.
 *
 * @param {number|bigint} seconds
 * @returns {string|undefined}
 */
function epochDate (seconds) {
  const date = new Date(Number(seconds) * 1000)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export { tagName, readVarint, toBase32, toBase58btc, decodeCid, bignum, epochDate }
