// never reference the file directly to ensure the
// indepency of the json module
import { Type } from 'cborg'
import { encodeCustom } from 'cborg'
import { encodeErrPrefix } from 'cborg'
import { asU8A, fromString } from 'cborg'

/**
 * @typedef {import('../../interface').EncodeOptions} EncodeOptions
 * @typedef {import('../../interface').TokenTypeEncoder} TokenTypeEncoder
 * @typedef {import('../token').Token} Token
 * @typedef {import('../bl').Bl} Bl
 */

/**
 * @param {(buf: Bl, token: Token) => void} action
 * @returns {TokenTypeEncoder}
 */
function wrapCompareTokens (action) {
  const wrapped = (/** @type {Bl} */ buf, /** @type {Token} */token) => action(buf, token)
  /**
   * @param {Token} tok1
   * @param {Token} tok2
   * @returns {number}
   */
  wrapped.compareTokens = function compareTokens (tok1, tok2) {
    return tok1.value < tok2.value ? -1 : tok1.value > tok2.value ? 1 : 0
  }
  return wrapped
}

/**
 * @returns {TokenTypeEncoder[]}
 */
function makeJSONEncoders() {
  /** @type {TokenTypeEncoder[]} */
  const encoders = []
  /** @type {{type:Type,elements:number}[]} */
  const inRecursive = []

  /**
   * @param {Bl} buf
   */
  function prefix (buf) {
    const recurs = inRecursive[inRecursive.length - 1]
    if (recurs) {
      if (recurs.type.equals(Type.array)) {
        recurs.elements++
        if (recurs.elements !== 1) { // >first
          buf.push([44]) // ','
        }
      }
      if (recurs.type.equals(Type.map)) {
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

  encoders[Type.uint.major] = wrapCompareTokens((buf, token) => {
    prefix(buf)
    const is = String(token.value)
    const isa = []
    for (let i = 0; i < is.length; i++) {
      isa[i] = is.charCodeAt(i)
    }
    buf.push(isa)
  })

  encoders[Type.negint.major] = wrapCompareTokens((buf, token) => {
     encoders[Type.uint.major](buf, token)
   })

  encoders[Type.bytes.major] = wrapCompareTokens((_buf, _token) => {
    throw new Error(`${encodeErrPrefix} unsupported type: Uint8Array`)
  })

  encoders[Type.string.major] = wrapCompareTokens((buf, token) => {
    prefix(buf)
    const byts = fromString(JSON.stringify(token.value))
    buf.push(byts.length > 32 ? asU8A(byts) : byts)
  })

  encoders[Type.array.major] = wrapCompareTokens((buf, _token) => {
    prefix(buf)
    inRecursive.push({ type: Type.array, elements: 0 })
    buf.push([91]) // '['
  })

  encoders[Type.map.major] = wrapCompareTokens((buf, _token) => {
    prefix(buf)
    inRecursive.push({ type: Type.map, elements: 0 })
    buf.push([123]) // '{'
  })

  encoders[Type.tag.major] = wrapCompareTokens((_buf, _token) => {
  })

  encoders[Type.float.major] = wrapCompareTokens((buf, token) => {
    if (token.type.equals(Type.break)) {
      const recurs = inRecursive.pop()
      if (recurs) {
        if (recurs.type.equals(Type.array)) {
          buf.push([93]) // ']'
        } else if (recurs.type.equals(Type.map)) {
          buf.push([125]) // '}'
        /* c8 ignore next 3 */
        } else {
          throw new Error('Unexpected recursive type; this should not happen!')
        }
        return
      }
      /* c8 ignore next 2 */
      throw new Error('Unexpected break; this should not happen!')
    }
    if (token.value === undefined) {
      throw new Error(`${encodeErrPrefix} unsupported type: undefined`)
    }

    prefix(buf)
    if (token.type.equals(Type.true)) {
      buf.push([116, 114, 117, 101]) // 'true'
      return
    } else if (token.type.equals(Type.false)) {
      buf.push([102, 97, 108, 115, 101]) // 'false'
      return
    } else if (token.type.equals(Type.null)) {
      buf.push([110, 117, 108, 108]) // 'null'
      return
    }

    // number
    const is = String(token.value)
    const isa = []
    let dp = false
    for (let i = 0; i < is.length; i++) {
      isa[i] = is.charCodeAt(i)
      if (!dp && (isa[i] === 46 || isa[i] === 101 || isa[i] === 69)) { // '[.eE]'
        dp = true
      }
    }
    if (!dp) { // need a decimal point for floats
      isa.push(46) // '.'
      isa.push(48) // '0'
    }
    buf.push(isa)
  })
  return encoders
}

// The below code is mostly taken and modified from https://github.com/feross/buffer
// Licensed MIT. Copyright (c) Feross Aboukhadijeh
// function encodeUtf8 (string, byts) {
//   let codePoint
//   const length = string.length
//   let leadSurrogate = null

//   for (let i = 0; i < length; ++i) {
//     codePoint = string.charCodeAt(i)

//     // is surrogate component
//     if (codePoint > 0xd7ff && codePoint < 0xe000) {
//       // last char was a lead
//       if (!leadSurrogate) {
//         // no lead yet
//         /* c8 ignore next 9 */
//         if (codePoint > 0xdbff) {
//           // unexpected trail
//           byts.push(0xef, 0xbf, 0xbd)
//           continue
//         } else if (i + 1 === length) {
//           // unpaired lead
//           byts.push(0xef, 0xbf, 0xbd)
//           continue
//         }

//         // valid lead
//         leadSurrogate = codePoint

//         continue
//       }

//       // 2 leads in a row
//       /* c8 ignore next 5 */
//       if (codePoint < 0xdc00) {
//         byts.push(0xef, 0xbf, 0xbd)
//         leadSurrogate = codePoint
//         continue
//       }

//       // valid surrogate pair
//       codePoint = (leadSurrogate - 0xd800 << 10 | codePoint - 0xdc00) + 0x10000
//     /* c8 ignore next 4 */
//     } else if (leadSurrogate) {
//       // valid bmp char, but last char was a lead
//       byts.push(0xef, 0xbf, 0xbd)
//     }

//     leadSurrogate = null

//     // encode utf8
//     if (codePoint < 0x80) {
//       // special JSON escapes
//       switch (codePoint) {
//         case 8: // '\b'
//           byts.push(92, 98) // '\\b'
//           continue
//         case 9: // '\t'
//           byts.push(92, 116) // '\\t'
//           continue
//         case 10: // '\n'
//           byts.push(92, 110) // '\\n'
//           continue
//         case 12: // '\f'
//           byts.push(92, 102) // '\\f'
//           continue
//         case 13: // '\r'
//           byts.push(92, 114) // '\\r'
//           continue
//         case 34: // '"'
//           byts.push(92, 34) // '\\"'
//           continue
//         case 92: // '\\'
//           byts.push(92, 92) // '\\\\'
//           continue
//       }

//       byts.push(codePoint)
//     } else if (codePoint < 0x800) {
//       /* c8 ignore next 1 */
//       byts.push(
//         codePoint >> 0x6 | 0xc0,
//         codePoint & 0x3f | 0x80
//       )
//     } else if (codePoint < 0x10000) {
//       /* c8 ignore next 1 */
//       byts.push(
//         codePoint >> 0xc | 0xe0,
//         codePoint >> 0x6 & 0x3f | 0x80,
//         codePoint & 0x3f | 0x80
//       )
//     /* c8 ignore next 9 */
//     } else if (codePoint < 0x110000) {
//       byts.push(
//         codePoint >> 0x12 | 0xf0,
//         codePoint >> 0xc & 0x3f | 0x80,
//         codePoint >> 0x6 & 0x3f | 0x80,
//         codePoint & 0x3f | 0x80
//       )
//     } else {
//       /* c8 ignore next 2 */
//       throw new Error('Invalid code point')
//     }
//   }
// }

/**
 * @param {(Token|Token[])[]} e1
 * @param {(Token|Token[])[]} e2
 * @returns {number}
 */
function mapSorter (e1, e2) {
  if (Array.isArray(e1[0]) || Array.isArray(e2[0])) {
    throw new Error(`${encodeErrPrefix} complex map keys are not supported`)
  }
  const keyToken1 = e1[0]
  const keyToken2 = e2[0]
  if (!keyToken1.type.equals(Type.string) || !keyToken2.type.equals(Type.string)) {
    throw new Error(`${encodeErrPrefix} non-string map keys are not supported`)
  }
  if (keyToken1 < keyToken2) {
    return -1
  }
  if (keyToken1 > keyToken2) {
    return 1
  }
  /* c8 ignore next 1 */
  throw new Error(`${encodeErrPrefix} unexpected duplicate map keys, this is not supported`)
}

const defaultEncodeOptions = { addBreakTokens: true, mapSorter }

/**
 * @param {any} data
 * @param {EncodeOptions} [options]
 * @returns {Uint8Array}
 */
function encode (data, options) {
  options = Object.assign({}, defaultEncodeOptions, options)
  return encodeCustom(data, makeJSONEncoders(), options)
}

export { encode }
