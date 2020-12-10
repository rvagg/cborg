import { Token, Type } from './token.js'
import { decodeErrPrefix } from './common.js'

const MINOR_FALSE = 20
const MINOR_TRUE = 21
const MINOR_NULL = 22
const MINOR_UNDEFINED = 23

const MINOR_FLOAT16 = 25
const MINOR_FLOAT32 = 26
const MINOR_FLOAT64 = 27

const MINOR_BREAK = 31

function decodeFloat (data, pos, minor, options) {
  if (minor === MINOR_FALSE) { // false
    return new Token(Type.false, false, 1)
  }

  if (minor === MINOR_TRUE) { // true
    return new Token(Type.true, true, 1)
  }

  if (minor === MINOR_NULL) { // null
    return new Token(Type.null, null, 1)
  }

  if (minor === MINOR_UNDEFINED) { // undefined
    return new Token(Type.undefined, undefined, 1)
  }

  if (minor === MINOR_FLOAT16) {
    return new Token(Type.float, decodeFloat16(data, pos + 1), 3)
  }

  if (minor === MINOR_FLOAT32) {
    return new Token(Type.float, decodeFloat32(data, pos + 1), 5)
  }

  if (minor === MINOR_FLOAT64) {
    return new Token(Type.float, decodeFloat64(data, pos + 1), 9)
  }

  if (minor === MINOR_BREAK) { // for end of indefinite length items
    return new Token(Type.break, undefined, 1)
  }

  throw new Error(`${decodeErrPrefix} simple values are not supported (${minor})`)
}

function encodeFloat (buf, token) {
  const float = token.value

  if (float === false) {
    buf.set(0, Type.float.majorEncoded | MINOR_FALSE)
    return 1
  }

  if (float === true) {
    buf.set(0, Type.float.majorEncoded | MINOR_TRUE)
    return 1
  }

  if (float === null) {
    buf.set(0, Type.float.majorEncoded | MINOR_NULL)
    return 1
  }

  if (float === undefined) {
    buf.set(0, Type.float.majorEncoded | MINOR_UNDEFINED)
    return 1
  }

  encodeFloat16(float)
  let decoded = decodeFloat16(ui8a, 1)
  if (float === decoded || Number.isNaN(decoded)) {
    ui8a[0] = 0xf9
    buf.copyTo(0, ui8a.subarray(0, 3))
    return 3
  }

  encodeFloat32(float)
  decoded = decodeFloat32(ui8a, 1)
  if (float === decoded) {
    ui8a[0] = 0xfa
    buf.copyTo(0, ui8a.subarray(0, 5))
    return 5
  }

  encodeFloat64(float)
  decoded = decodeFloat64(ui8a, 1)
  ui8a[0] = 0xfb
  buf.copyTo(0, ui8a.subarray(0, 9))
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

function decodeFloat16 (ui8a, pos) {
  const offset = (ui8a.offset || 0) + pos
  if (ui8a.buffer.byteLength - offset < 2) {
    throw new Error(`${decodeErrPrefix} not enough data for float16`)
  }

  const half = (ui8a[offset] << 8) + ui8a[offset + 1]
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

function decodeFloat32 (ui8a, pos) {
  const offset = (ui8a.offset || 0) + pos
  if (ui8a.buffer.byteLength - offset < 4) {
    throw new Error(`${decodeErrPrefix} not enough data for float32`)
  }
  return new DataView(ui8a.buffer, offset, 4).getFloat32(0, false)
}

function encodeFloat64 (inp) {
  dataView.setFloat64(0, inp, false)
}

function decodeFloat64 (ui8a, pos) {
  const offset = (ui8a.offset || 0) + pos
  if (ui8a.buffer.byteLength - offset < 8) {
    throw new Error(`${decodeErrPrefix} not enough data for float64`)
  }
  return new DataView(ui8a.buffer, offset, 8).getFloat64(0, false)
}

/*
run(Infinity)
run(-Infinity)
run(NaN)
run(3.4028234663852886e+38)
run(1.0e+300)
run(parseInt(process.argv[2], 10) / parseInt(process.argv[3], 10))
*/

export { decodeFloat as decode, encodeFloat as encode }
