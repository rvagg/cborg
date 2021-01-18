// TODO: shift some of the bytes logic to bytes-utils so we can use Buffer
// where possible

import { Token, Type } from './token.js'
import { decodeErrPrefix } from './common.js'

const MINOR_FALSE = 20
const MINOR_TRUE = 21
const MINOR_NULL = 22
const MINOR_UNDEFINED = 23

export function decodeUndefined (data, pos, minor, options) {
  if (options.allowUndefined === false) {
    throw new Error(`${decodeErrPrefix} undefined values are not supported`)
  }
  return new Token(Type.undefined, undefined, 1)
}

export function decodeBreak (data, pos, minor, options) {
  if (options.allowIndefinite === false) {
    throw new Error(`${decodeErrPrefix} indefinite length items not allowed`)
  }
  return new Token(Type.break, undefined, 1)
}

function createToken (value, bytes, options) {
  if (options) {
    if (options.allowNaN === false && Number.isNaN(value)) {
      throw new Error(`${decodeErrPrefix} NaN values are not supported`)
    }
    if (options.allowInfinity === false && (value === Infinity || value === -Infinity)) {
      throw new Error(`${decodeErrPrefix} Infinity values are not supported`)
    }
  }
  return new Token(Type.float, value, bytes)
}

export function decodeFloat16 (data, pos, minor, options) {
  return createToken(readFloat16(data, pos + 1), 3, options)
}

export function decodeFloat32 (data, pos, minor, options) {
  return createToken(readFloat32(data, pos + 1), 5, options)
}

export function decodeFloat64 (data, pos, minor, options) {
  return createToken(readFloat64(data, pos + 1), 9, options)
}

export function encodeFloat (buf, token, options) {
  const float = token.value

  if (float === false) {
    buf.push([Type.float.majorEncoded | MINOR_FALSE])
  } else if (float === true) {
    buf.push([Type.float.majorEncoded | MINOR_TRUE])
  } else if (float === null) {
    buf.push([Type.float.majorEncoded | MINOR_NULL])
  } else if (float === undefined) {
    buf.push([Type.float.majorEncoded | MINOR_UNDEFINED])
  } else {
    let decoded
    let success = false
    if (!options || options.float64 !== true) {
      encodeFloat16(float)
      decoded = readFloat16(ui8a, 1)
      if (float === decoded || Number.isNaN(float)) {
        ui8a[0] = 0xf9
        buf.push(ui8a.slice(0, 3))
        success = true
      } else {
        encodeFloat32(float)
        decoded = readFloat32(ui8a, 1)
        if (float === decoded) {
          ui8a[0] = 0xfa
          buf.push(ui8a.slice(0, 5))
          success = true
        }
      }
    }
    if (!success) {
      encodeFloat64(float)
      decoded = readFloat64(ui8a, 1)
      ui8a[0] = 0xfb
      buf.push(ui8a.slice(0, 9))
    }
  }
}

encodeFloat.encodedSize = function encodedSize (token, options) {
  const float = token.value

  if (float === false || float === true || float === null || float === undefined) {
    return 1
  }

  let decoded
  if (!options || options.float64 !== true) {
    encodeFloat16(float)
    decoded = readFloat16(ui8a, 1)
    if (float === decoded || Number.isNaN(float)) {
      return 3
    }
    encodeFloat32(float)
    decoded = readFloat32(ui8a, 1)
    if (float === decoded) {
      return 5
    }
  }
  return 9
}

const buffer = new ArrayBuffer(9)
const dataView = new DataView(buffer, 1)
const ui8a = new Uint8Array(buffer, 0)

function encodeFloat16 (inp) {
  if (inp === Infinity) {
    dataView.setUint16(0, 0x7c00, false)
  } else if (inp === -Infinity) {
    dataView.setUint16(0, 0xfc00, false)
  } else if (Number.isNaN(inp)) {
    dataView.setUint16(0, 0x7e00, false)
  } else {
    dataView.setFloat32(0, inp)
    const valu32 = dataView.getUint32(0)
    const exponent = (valu32 & 0x7f800000) >> 23
    const mantissa = valu32 & 0x7fffff

    /* c8 ignore next 6 */
    if (exponent === 0xff) {
      // too big, Infinity, but this should be hard (impossible?) to trigger
      dataView.setUint16(0, 0x7c00, false)
    } else if (exponent === 0x00) {
      // 0.0, -0.0 and subnormals, shouldn't be possible to get here because 0.0 should be counted as an int
      dataView.setUint16(0, ((inp & 0x80000000) >> 16) | (mantissa >> 13), false)
    } else { // standard numbers
      // chunks of logic here borrowed from https://github.com/PJK/libcbor/blob/c78f437182533e3efa8d963ff4b945bb635c2284/src/cbor/encoding.c#L127
      const logicalExponent = exponent - 127
      // Now we know that 2^exponent <= 0 logically
      /* c8 ignore next 6 */
      if (logicalExponent < -24) {
        /* No unambiguous representation exists, this float is not a half float
          and is too small to be represented using a half, round off to zero.
          Consistent with the reference implementation. */
        // should be difficult (impossible?) to get here in JS
        dataView.setUint16(0, 0)
      } else if (logicalExponent < -14) {
        /* Offset the remaining decimal places by shifting the significand, the
          value is lost. This is an implementation decision that works around the
          absence of standard half-float in the language. */
        dataView.setUint16(0, ((valu32 & 0x80000000) >> 16) | /* sign bit */ (1 << (24 + logicalExponent)), false)
      } else {
        dataView.setUint16(0, ((valu32 & 0x80000000) >> 16) | ((logicalExponent + 15) << 10) | (mantissa >> 13), false)
      }
    }
  }
}

function readFloat16 (ui8a, pos) {
  if (ui8a.length - pos < 2) {
    throw new Error(`${decodeErrPrefix} not enough data for float16`)
  }

  const half = (ui8a[pos] << 8) + ui8a[pos + 1]
  if (half === 0x7c00) {
    return Infinity
  }
  if (half === 0xfc00) {
    return -Infinity
  }
  if (half === 0x7e00) {
    return NaN
  }
  const exp = (half >> 10) & 0x1f
  const mant = half & 0x3ff
  let val
  if (exp === 0) {
    val = mant * (2 ** -24)
  } else if (exp !== 31) {
    val = (mant + 1024) * (2 ** (exp - 25))
  /* c8 ignore next 4 */
  } else {
    // may not be possible to get here
    val = mant === 0 ? Infinity : NaN
  }
  return (half & 0x8000) ? -val : val
}

function encodeFloat32 (inp) {
  dataView.setFloat32(0, inp, false)
}

function readFloat32 (ui8a, pos) {
  if (ui8a.length - pos < 4) {
    throw new Error(`${decodeErrPrefix} not enough data for float32`)
  }
  const offset = (ui8a.byteOffset || 0) + pos
  return new DataView(ui8a.buffer, offset, 4).getFloat32(0, false)
}

function encodeFloat64 (inp) {
  dataView.setFloat64(0, inp, false)
}

function readFloat64 (ui8a, pos) {
  if (ui8a.length - pos < 8) {
    throw new Error(`${decodeErrPrefix} not enough data for float64`)
  }
  const offset = (ui8a.byteOffset || 0) + pos
  return new DataView(ui8a.buffer, offset, 8).getFloat64(0, false)
}
