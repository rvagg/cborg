import { Tokeniser } from './decode.js'
import { decodeErrPrefix } from './common.js'
import { toHex, fromHex } from './byte-utils.js'
import { tagName, decodeCid, bignum, epochDate } from './diagnostic-tags.js'

const utf8Encoder = new TextEncoder()
// ignoreBOM: true keeps a leading U+FEFF in the output
const utf8Decoder = new TextDecoder('utf-8', { ignoreBOM: true })

// Nesting is shown by indentation up to this many columns, deeper levels share the last column
const MAX_MARGIN = 20

// Tag 24 content is expanded to this depth, deeper levels show as bytes
const MAX_EMBED_DEPTH = 16

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
  yield * diagnosticLines(inp, width, 0, 0)
}

/**
 * @param {Uint8Array} inp
 * @param {number} width
 * @param {number} base columns of margin before the first level
 * @param {number} depth tag 24 levels this input is embedded in, 0 at the top where a sequence of items is allowed
 * @returns {Generator<string, void, unknown>}
 */
function * diagnosticLines (inp, width, base, depth) {
  const tokeniser = new Tokeniser(inp, { retainStringBytes: true, allowBigInt: true })
  let pos = 0
  // items still to come in each open container, Infinity until its break
  const indent = []
  // set by a tag token for the one that follows, its content
  /** @type {number|bigint|undefined} */
  let parentTag

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
    const tag = parentTag
    parentTag = name === 'tag' ? token.value : undefined
    if (name === 'break') {
      if (!indent.length || indent[indent.length - 1] !== Infinity) {
        throw new Error('CBOR decode error: unexpected break outside an indefinite length item')
      }
      indent.pop()
    }
    const margin = ''.padStart(Math.min(base + indent.length * 2, MAX_MARGIN), ' ')
    const inner = `${margin}  `
    // bytes per hex line under this item
    const wh = Math.max(1, Math.floor(((width / 2) - inner.length - 1) / 2))
    /**
     * @param {string} text
     * @returns {string}
     */
    const note = (text) => `${''.padEnd(width / 2, ' ')}# ${inner}${text}`
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
    if (name === 'tag' && tagName(token.value)) {
      outp += ` ${tagName(token.value)}`
    }
    yield outp

    let cid
    if (tag === 42) {
      try {
        if (name !== 'bytes') {
          throw new Error('content is not a byte string')
        }
        cid = decodeCid(token.value)
      } catch (err) {
        yield note(`invalid CID: ${/** @type {Error} */ (err).message}`)
      }
    }

    /** @type {string[]|undefined} */
    let embedded
    if (tag === 24) {
      if (name !== 'bytes') {
        yield note('invalid embedded CBOR: content is not a byte string')
      } else if (depth >= MAX_EMBED_DEPTH) {
        yield note(`embedded CBOR nested deeper than ${MAX_EMBED_DEPTH} levels is not expanded`)
      } else {
        try {
          embedded = [...diagnosticLines(token.value, width, inner.length, depth + 1)]
        } catch (err) {
          const message = /** @type {Error} */ (err).message.replace(`${decodeErrPrefix} `, '')
          yield note(`invalid embedded CBOR: ${message}`)
        }
      }
    }

    if (embedded) {
      yield * embedded
    } else if (cid) {
      for (const { start, end, label } of cid.parts) {
        for (let snip = start; snip < end; snip += wh) {
          const hex = `${inner}${toHex(token.value.subarray(snip, Math.min(snip + wh, end)))}`
          yield snip === start ? `${hex.padEnd(width / 2, ' ')}# ${inner}${label}` : hex
        }
      }
      yield note(`CIDv${cid.version}(${cid.string})`)
    } else if (str) {
      const asString = name === 'string' && repr !== token.byteValue
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
        yield `${inner}${toHex(piece)}`.padEnd(width / 2, ' ') + `# ${inner}"${st}"`
      }
    }

    if (tag === 1 && (name === 'uint' || name === 'negint' || name === 'float')) {
      const date = epochDate(token.value)
      if (date) {
        yield note(`date(${date})`)
      }
    } else if ((tag === 2 || tag === 3) && name === 'bytes') {
      yield note(`bignum(${bignum(tag, token.value)})`)
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
    if (depth > 0 && !indent.length && !tokeniser.done()) {
      throw new Error(`${decodeErrPrefix} more than one data item`)
    }
  }
  if (indent.length) {
    throw new Error(`${decodeErrPrefix} not enough data, input ended inside an open item`)
  }
  if (depth > 0 && pos === 0) {
    throw new Error(`${decodeErrPrefix} no data item`)
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
