import { Token, Type } from './token.js'
import { assertEnoughData } from './common.js'
import * as uint from './0uint.js'
import { encodeBytes, compareBytes } from './2bytes.js'
import { fromString, toString } from './byte-utils.js'

function toToken (data, pos, prefix, length) {
  const totLength = prefix + length
  const start = pos + prefix
  const end = pos + totLength
  assertEnoughData(data, pos, totLength)
  // decode manually for short strings, use native utilities otherwise
  const str = length > 64 ? toString(data.subarray(start, end)) : utf8Slice(data, start, end)
  return new Token(Type.string, str, totLength)
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

export const encodeString = (buf, token) => encodeBytes(buf, token)

encodeString.compareTokens = function compareTokens (tok1, tok2) {
  if (tok1.encodedBytes === undefined) {
    tok1.encodedBytes = fromString(tok1.value)
  }
  if (tok2.encodedBytes === undefined) {
    tok2.encodedBytes = fromString(tok2.value)
  }

  return compareBytes(tok1.encodedBytes, tok2.encodedBytes)
}

// The below code is mostly taken from https://github.com/feross/buffer
// Licensed MIT. Copyright (c) Feross Aboukhadijeh

function utf8Slice (buf, offset, end) {
  const res = []

  while (offset < end) {
    const firstByte = buf[offset]
    let codePoint = null
    let bytesPerSequence = (firstByte > 0xef) ? 4 : (firstByte > 0xdf) ? 3 : (firstByte > 0xbf) ? 2 : 1

    if (offset + bytesPerSequence <= end) {
      let secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[offset + 1]
          if ((secondByte & 0xc0) === 0x80) {
            tempCodePoint = (firstByte & 0x1f) << 0x6 | (secondByte & 0x3f)
            if (tempCodePoint > 0x7f) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[offset + 1]
          thirdByte = buf[offset + 2]
          if ((secondByte & 0xc0) === 0x80 && (thirdByte & 0xc0) === 0x80) {
            tempCodePoint = (firstByte & 0xf) << 0xc | (secondByte & 0x3f) << 0x6 | (thirdByte & 0x3f)
            if (tempCodePoint > 0x7fF && (tempCodePoint < 0xd800 || tempCodePoint > 0xdfFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[offset + 1]
          thirdByte = buf[offset + 2]
          fourthByte = buf[offset + 3]
          if ((secondByte & 0xc0) === 0x80 && (thirdByte & 0xc0) === 0x80 && (fourthByte & 0xc0) === 0x80) {
            tempCodePoint = (firstByte & 0xf) << 0x12 | (secondByte & 0x3f) << 0xc | (thirdByte & 0x3f) << 0x6 | (fourthByte & 0x3f)
            if (tempCodePoint > 0xffff && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xffFD
      bytesPerSequence = 1
    } else if (codePoint > 0xffff) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3ff | 0xd800)
      codePoint = 0xdc00 | codePoint & 0x3ff
    }

    res.push(codePoint)
    offset += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
const MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  const len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  let res = ''
  let i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}
