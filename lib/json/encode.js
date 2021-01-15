import { Type } from '../token.js'
import { encodeCustom } from '../encode.js'
import { fromString } from '../byte-utils.js'

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
          buf.push([','.charCodeAt(0)])
        }
      }
      if (recurs.type === Type.map) {
        recurs.elements++
        if (recurs.elements !== 1) { // >first
          if (recurs.elements % 2 === 1) { // key
            buf.push([','.charCodeAt(0)])
          } else {
            buf.push([':'.charCodeAt(0)])
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
    const sbuf = fromString(token.value)
    buf.push(['"'.charCodeAt(0)])
    buf.push(sbuf)
    buf.push(['"'.charCodeAt(0)])
  }

  [Type.array.major] (buf, token) {
    this.prefix(buf)
    this.inRecursive.push({ type: Type.array, elements: 0 })
    buf.push(['['.charCodeAt(0)])
  }

  [Type.map.major] (buf, token) {
    this.prefix(buf)
    this.inRecursive.push({ type: Type.map, elements: 0 })
    buf.push(['{'.charCodeAt(0)])
  }

  [Type.tag.major] (buf, token) {
  }

  [Type.float.major] (buf, token) {
    if (token.type.name === 'break') {
      const recurs = this.inRecursive.pop()
      if (recurs) {
        if (recurs.type === Type.array) {
          buf.push([']'.charCodeAt(0)])
        } else if (recurs.type === Type.map) {
          buf.push(['}'.charCodeAt(0)])
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

const defaultEncodeOptions = { addBreakTokens: true }

function encode (data, options) {
  options = Object.assign({}, defaultEncodeOptions, options)
  return encodeCustom(data, new JSONEncoder(), options)
}

export { encode }
