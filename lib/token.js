class Type {
  constructor (major, name, terminal) {
    this.major = major
    this.majorEncoded = major << 5
    this.name = name
    this.terminal = terminal
  }

  toString () {
    return `Type[${this.major}].${this.name}`
  }
}

// convert to static fields when better supported
Type.uint = new Type(0, 'uint', true)
Type.negint = new Type(1, 'negint', true)
Type.bytes = new Type(2, 'bytes', true)
Type.string = new Type(3, 'string', true)
Type.array = new Type(4, 'array', false)
Type.map = new Type(5, 'map', false)
Type.tag = new Type(6, 'tag', false) // terminal?
Type.float = new Type(7, 'float', true)

class Token {
  constructor (type, value, encodedLength) {
    this.type = type
    this.value = value
    this.encodedLength = encodedLength
  }

  toString () {
    return `Token[${this.type}].${this.value}`
  }
}

module.exports.Type = Type
module.exports.Token = Token
