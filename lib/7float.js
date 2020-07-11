import { Token, Type } from './token.js'
import { decodeErrPrefix } from './common.js'

const MINOR_FALSE = 20
const MINOR_TRUE = 21
const MINOR_NULL = 22
const MINOR_UNDEFINED = 23
const MINOR_BREAK = 24 // TODO: maybe not support this yet

function decodeFloat (data, pos, minor, options) {
  if (minor < MINOR_FALSE || (minor !== MINOR_BREAK && minor > MINOR_UNDEFINED)) {
    throw new Error(`${decodeErrPrefix} unknown major 7 minor value ${minor}`)
  }

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

  if (minor === MINOR_BREAK) { // undefined
    return new Token(Type.break, undefined, 1)
  }
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
}

export { decodeFloat as decode, encodeFloat as encode }
