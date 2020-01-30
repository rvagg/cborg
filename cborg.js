const decoders = []
const bl = require('./lib/bl')
const { decodeErrPrefix } = require('./lib/common')
const uint = require('./lib/0uint')
const negint = require('./lib/1negint')
const bytes = require('./lib/2bytes')
const string = require('./lib/3string')

decoders[uint.MAJOR] = uint.decode
decoders[negint.MAJOR] = negint.decode
decoders[bytes.MAJOR] = bytes.decode
decoders[string.MAJOR] = string.decode

const defaultDecodeOptions = {
  strict: false
}

function decode (data, options) {
  options = Object.assign({}, defaultDecodeOptions, options)
  const pos = 0

  const major = data[0] >>> 5
  const minor = data[0] & 31

  const decoder = decoders[major]
  if (!decoder) {
    throw new Error(`${decodeErrPrefix} no decoder for major type ${major}`)
  }

  return decoder(data, pos, minor, options)
}

function encode (data) {
  const buf = bl(1024)
  let type
  if (typeof data === 'number') {
    if (data >= 0) {
      type = uint
    } else {
      type = negint
    }
  } else if (Buffer.isBuffer(data) || data instanceof Uint8Array) { // TODO other array buffers?
    type = bytes
  } else if (typeof data === 'string') {
    type = string
  } else {
    throw new Error('unsupported')
  }

  const length = type.encode(buf, data)
  buf.inc(length, true) // noGrow for final call
  return buf.toBuffer()
}

module.exports.decode = decode
module.exports.encode = encode
