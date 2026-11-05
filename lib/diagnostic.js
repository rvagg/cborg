import { Tokeniser } from './decode.js'
import { toHex, fromHex } from './byte-utils.js'

const utf8Encoder = new TextEncoder()
// ignoreBOM: true keeps a leading U+FEFF in the output
const utf8Decoder = new TextDecoder('utf-8', { ignoreBOM: true })

// Nesting is shown by indentation up to this many columns, deeper levels share the last column
const MAX_MARGIN = 20

// C0, DEL, C1, line and paragraph separators, bidirectional overrides and isolates
const unprintable = /[\\\p{Cc}\u2028\u2029\u202a-\u202e\u2066-\u2069]/gu

/**
 * Escape characters that could drive a terminal or end a diagnostic comment line.
 * @param {string} str
 * @returns {string}
 */
function escapeText (str) {
  return str.replace(unprintable, (c) => {
    if (c === '\\') {
      return '\\\\'
    }
    const code = c.charCodeAt(0)
    return code < 0x100
      ? `\\x${code.toString(16).padStart(2, '0')}`
      : `\\u${code.toString(16).padStart(4, '0')}`
  })
}

/**
 * Bytes taken by the length or argument that follows an initial byte, from
 * its additional information (RFC 8949 section 3), whatever the value is.
 *
 * @param {number} initial
 * @returns {number}
 */
function argumentSize (initial) {
  const minor = initial & 0x1f
  return minor < 24 || minor > 27 ? 0 : 1 << (minor - 24)
}

/**
 * Where to end a slice of UTF-8 starting at `start` and nominally `size` bytes
 * long so that no character is split. A character wider than `size` is kept whole.
 *
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} size
 * @returns {number}
 */
function utf8SliceEnd (bytes, start, size) {
  const isContinuation = (/** @type {number} */ i) => i < bytes.length && (bytes[i] & 0xc0) === 0x80
  let end = Math.min(start + size, bytes.length)
  while (end > start && isContinuation(end)) {
    end--
  }
  if (end === start) {
    end = Math.min(start + size, bytes.length)
    while (isContinuation(end)) {
      end++
    }
  }
  return end
}

/**
 * @param {Uint8Array} inp
 * @param {number} [width]
 */
function * tokensToDiagnostic (inp, width = 100) {
  const tokeniser = new Tokeniser(inp, { retainStringBytes: true, allowBigInt: true })
  let pos = 0
  // items still to come in each open container, Infinity until its break
  const indent = []

  /**
   * @param {number} start
   * @param {number} length
   * @returns {string}
   */
  const slc = (start, length) => {
    return toHex(inp.slice(pos + start, pos + start + length))
  }

  while (!tokeniser.done()) {
    const token = tokeniser.next()
    const name = token.type.name
    if (name === 'break') {
      if (!indent.length || indent[indent.length - 1] !== Infinity) {
        throw new Error('CBOR decode error: unexpected break outside an indefinite length item')
      }
      indent.pop()
    }
    let margin = ''.padStart(Math.min(indent.length * 2, MAX_MARGIN), ' ')
    const str = name === 'bytes' || name === 'string'
    const container = name === 'array' || name === 'map'
    /** @type {Uint8Array|string} */
    let repr = ''
    /** @type {string|number} */
    let v
    let outp = `${margin}${slc(0, 1)}`

    if (str) {
      let asString = name === 'string'
      repr = asString ? utf8Encoder.encode(token.value) : token.value
      if (asString && token.byteValue !== undefined && repr.length !== token.byteValue.length) {
        // not valid UTF-8, show the original bytes instead (you can probably blame a Go programmer for this)
        repr = token.byteValue
        asString = false
      }
      v = repr.length
    } else if (name === 'break') {
      v = name
    } else if (container && token.value === Infinity) {
      v = '*'
    } else if (Object.is(token.value, -0)) {
      v = '-0'
    } else {
      v = String(token.value)
    }

    if (str || container) {
      outp += ` ${slc(1, argumentSize(inp[pos]))}`.trimEnd()
    } else {
      // print the value if it's not compacted into the first byte
      // @ts-ignore encodedLength is set on a decode operation
      outp += ` ${slc(1, token.encodedLength - 1)}`
    }

    outp = outp.padEnd(width / 2, ' ')
    outp += `# ${margin}${name}`
    if (name !== v) {
      outp += `(${v})`
    }
    yield outp

    if (str) {
      const asString = name === 'string' && repr !== token.byteValue
      margin += '  '
      const wh = Math.max(1, Math.floor(((width / 2) - margin.length - 1) / 2))
      let snip = 0
      while (repr.length - snip > 0) {
        // at least one byte per line so that the loop always advances
        const end = asString ? utf8SliceEnd(/** @type {Uint8Array} */ (repr), snip, wh) : Math.min(snip + wh, repr.length)
        const piece = /** @type {Uint8Array} */ (repr).slice(snip, end)
        snip = end
        const st = asString
          ? escapeText(utf8Decoder.decode(piece))
          : piece.reduce((/** @type {string} */ p, /** @type {number} */ c) => {
            if (c === 0x5c) {
              return `${p}\\\\`
            }
            if (c < 0x20 || (c >= 0x7f && c < 0xa1) || c === 0xad) {
              return `${p}\\x${c.toString(16).padStart(2, '0')}`
            }
            return `${p}${String.fromCharCode(c)}`
          }, '')
        yield `${margin}${toHex(piece)}`.padEnd(width / 2, ' ') + `# ${margin}"${st}"`
      }
    }

    if (indent.length && name !== 'break') {
      indent[indent.length - 1]--
    }
    if (!token.type.terminal) {
      switch (name) {
        case 'map':
          indent.push(token.value * 2)
          break
        case 'array':
          indent.push(token.value)
          break
        // TODO: test tags .. somehow
        case 'tag':
          indent.push(1)
          break
        default:
          throw new Error(`Unknown token type '${name}'`)
      }
    }
    while (indent.length && indent[indent.length - 1] <= 0) {
      indent.pop()
    }
    // @ts-ignore it should be set on a decode operation
    pos += token.encodedLength
  }
  if (indent.length) {
    throw new Error('CBOR decode error: not enough data, input ended inside an open item')
  }
}

/**
 * Convert an input string formatted as CBOR diagnostic output into binary CBOR form.
 * @param {string} input
 * @returns {Uint8Array}
 */
function fromDiag (input) {
  if (typeof input !== 'string') {
    throw new TypeError('Expected string input')
  }
  input = input.replace(/#.*?$/mg, '').replace(/[\s\r\n]+/mg, '')
  if (/[^a-f0-9]/i.test(input)) {
    throw new TypeError('Input string was not CBOR diagnostic format')
  }
  if (input.length % 2 !== 0) {
    throw new TypeError('Input string has an odd number of hex digits')
  }
  return fromHex(input)
}

export { tokensToDiagnostic, fromDiag }
