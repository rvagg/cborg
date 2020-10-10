import { Token, Type } from './token.js'
import { encode as bytesEncode, decode as bytesDecode, compareBytes } from './2bytes.js'

const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

function decodeString (data, pos, minor, options) {
  const decodedBytes = bytesDecode(data, pos, minor, options)
  const str = textDecoder.decode(decodedBytes.value)
  return new Token(Type.string, str, decodedBytes.encodedLength)
}

function encodeString (buf, token) {
  return bytesEncode(buf, token)
}

encodeString.compareTokens = function compareTokens (tok1, tok2) {
  if (tok1.encodedBytes === undefined) {
    tok1.encodedBytes = textEncoder.encode(tok1.value)
  }
  if (tok2.encodedBytes === undefined) {
    tok2.encodedBytes = textEncoder.encode(tok2.value)
  }

  return compareBytes(tok1.encodedBytes, tok2.encodedBytes)
}

export { decodeString as decode, encodeString as encode }
