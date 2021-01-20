import { Type } from '../token.js'
import { encodeCustom } from '../encode.js'
import { asU8A } from '../byte-utils.js'

class JSONEncoder {
  constructor () {
    this.inRecursive = []
  }

  prefix (buf) {
    const recurs = this.inRecursive[this.inRecursive.length - 1]
    if (recurs) {
      if (recurs.type === Type.array) {
        recurs.elements++
        if (recurs.elements !== 1) { // >first
          buf.push([44]) // ','
        }
      }
      if (recurs.type === Type.map) {
        recurs.elements++
        if (recurs.elements !== 1) { // >first
          if (recurs.elements % 2 === 1) { // key
            buf.push([44]) // ','
          } else {
            buf.push([58]) // ':'
          }
        }
      }
    }
  }

  [Type.uint.major] (buf, token) {
    this.prefix(buf)
    const is = String(token.value)
    const isa = []
    for (let i = 0; i < is.length; i++) {
      isa[i] = is.charCodeAt(i)
    }
    buf.push(isa)
  }

  [Type.negint.major] (buf, token) {
    this[Type.uint.major](buf, token)
  }

  [Type.bytes.major] (buf, token) {
  }

  [Type.string.major] (buf, token) {
    this.prefix(buf)
    const byts = [34] // '"'
    encodeUtf8(token.value, byts)
    byts.push(34) // '"'
    buf.push(byts.length > 32 ? asU8A(byts) : byts) // '"'
  }

  [Type.array.major] (buf, token) {
    this.prefix(buf)
    this.inRecursive.push({ type: Type.array, elements: 0 })
    buf.push([91]) // '['
  }

  [Type.map.major] (buf, token) {
    this.prefix(buf)
    this.inRecursive.push({ type: Type.map, elements: 0 })
    buf.push([123]) // '{'
  }

  [Type.tag.major] (buf, token) {}

  [Type.float.major] (buf, token) {
    if (token.type.name === 'break') {
      const recurs = this.inRecursive.pop()
      if (recurs) {
        if (recurs.type === Type.array) {
          buf.push([93]) // ']'
        } else if (recurs.type === Type.map) {
          buf.push([125]) // '}'
        } else {
          throw new Error('unknown recursive type')
        }
        return
      }
      throw new Error('unexpected break')
    }
    if (token.value === undefined) {
      throw new Error('undefined not supported')
    }
    this[Type.uint.major](buf, token)
  }
}

// The below code is mostly taken and modified from https://github.com/feross/buffer
// Licensed MIT. Copyright (c) Feross Aboukhadijeh

function encodeUtf8 (string, byts) {
  let codePoint
  const length = string.length
  let leadSurrogate = null

  for (let i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xd7ff && codePoint < 0xe000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        /* c8 ignore next 9 */
        if (codePoint > 0xdbff) {
          // unexpected trail
          byts.push(0xef, 0xbf, 0xbd)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          byts.push(0xef, 0xbf, 0xbd)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      /* c8 ignore next 5 */
      if (codePoint < 0xdc00) {
        byts.push(0xef, 0xbf, 0xbd)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xd800 << 10 | codePoint - 0xdc00) + 0x10000
    /* c8 ignore next 4 */
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      byts.push(0xef, 0xbf, 0xbd)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      // special JSON escapes
      switch (codePoint) {
        case 8: // '\b'
          byts.push(92, 98) // '\\b'
          continue
        case 9: // '\t'
          byts.push(92, 116) // '\\t'
          continue
        case 10: // '\n'
          byts.push(92, 110) // '\\n'
          continue
        case 12: // '\f'
          byts.push(92, 102) // '\\f'
          continue
        case 13: // '\r'
          byts.push(92, 114) // '\\r'
          continue
        case 34: // '"'
          byts.push(92, 34) // '\\"'
          continue
        case 92: // '\\'
          byts.push(92, 92) // '\\\\'
          continue
      }

      byts.push(codePoint)
    } else if (codePoint < 0x800) {
      /* c8 ignore next 1 */
      byts.push(
        codePoint >> 0x6 | 0xc0,
        codePoint & 0x3f | 0x80
      )
    } else if (codePoint < 0x10000) {
      /* c8 ignore next 1 */
      byts.push(
        codePoint >> 0xc | 0xe0,
        codePoint >> 0x6 & 0x3f | 0x80,
        codePoint & 0x3f | 0x80
      )
    /* c8 ignore next 9 */
    } else if (codePoint < 0x110000) {
      byts.push(
        codePoint >> 0x12 | 0xf0,
        codePoint >> 0xc & 0x3f | 0x80,
        codePoint >> 0x6 & 0x3f | 0x80,
        codePoint & 0x3f | 0x80
      )
    } else {
      /* c8 ignore next 2 */
      throw new Error('Invalid code point')
    }
  }
}

const defaultEncodeOptions = { addBreakTokens: true }

function encode (data, options) {
  options = Object.assign({}, defaultEncodeOptions, options)
  return encodeCustom(data, new JSONEncoder(), options)
}

export default encode
