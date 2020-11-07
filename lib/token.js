class Type {
  constructor (major, name, terminal) {
    this.major = major
    this.majorEncoded = major << 5
    this.name = name
    this.terminal = terminal
  }

  /* c8 ignore next 3 */
  toString () {
    return `Type[${this.major}].${this.name}`
  }

  compare (typ) {
    return this.major < typ.major ? -1 : this.major > typ.major ? 1 : 0
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
Type.false = new Type(7, 'false', true)
Type.true = new Type(7, 'true', true)
Type.null = new Type(7, 'null', true)
Type.undefined = new Type(7, 'undefined', true)
Type.break = new Type(7, 'break', true)
// Type.indefiniteLength = new Type(0, 'indefiniteLength', true)

class Token {
  constructor (type, value, encodedLength) {
    this.type = type
    this.value = value
    this.encodedLength = encodedLength
  }

  /* c8 ignore next 3 */
  toString () {
    return `Token[${this.type}].${this.value}`
  }
}

export { Type, Token }
