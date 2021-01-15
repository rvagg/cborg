import { decode as _decode } from '../decode.js'

class Tokeniser {
  constructor (data, options = {}) {
    this.pos = 0
    this.data = data
    this.options = options
  }

  done () {
    return this.pos >= this.data.length
  }

  next () {
    const byt = this.data[this.pos]
    this.pos += token.encodedLength
    return token
  }
}

function decode (data, options) {
  options = Object.assign({ tokenizer: new Tokeniser(data, options) }, options)
  return _decode(data, options)
}

export { decode }
