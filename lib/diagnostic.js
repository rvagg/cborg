import { toHex, fromHex } from './byte-utils.js'
import { diagnose } from './diagnose.js'

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
 * Annotated hex for CBOR, one line per item. Throws the decode error, if any,
 * after the lines for what was read before it.
 *
 * @param {Uint8Array} inp
 * @param {number} [width]
 */
function * tokensToDiagnostic (inp, width = 100) {
  const { bytes, items, error } = diagnose(inp)
  yield * itemLines(bytes, items, width, 0)
  if (error) {
    throw error.cause
  }
}

/**
 * Walk the tree in byte order without recursion, as nesting can be as deep as the input is long.
 *
 * @param {Uint8Array} bytes
 * @param {import('./diagnose.js').DiagnosticNode[]} items
 * @param {number} width
 * @param {number} base columns of margin before the first level
 * @returns {Generator<string, void, unknown>}
 */
function * itemLines (bytes, items, width, base) {
  const stack = [items.values()]
  while (stack.length) {
    const next = stack[stack.length - 1].next()
    if (next.done) {
      stack.pop()
      continue
    }
    yield * nodeLines(bytes, next.value, width, base)
    if (next.value.children) {
      stack.push(next.value.children.values())
    }
  }
}

/**
 * @param {Uint8Array} bytes
 * @param {import('./diagnose.js').DiagnosticNode} node
 * @param {number} width
 * @param {number} base
 * @returns {Generator<string, void, unknown>}
 */
function * nodeLines (bytes, node, width, base) {
  const { type, annotation } = node
  const margin = ''.padStart(Math.min(base + node.depth * 2, MAX_MARGIN), ' ')
  const inner = `${margin}  `
  // bytes per hex line under this item
  const wh = Math.max(1, Math.floor(((width / 2) - inner.length - 1) / 2))
  /**
   * @param {string} text
   * @returns {string}
   */
  const note = (text) => `${''.padEnd(width / 2, ' ')}# ${inner}${text}`
  const str = type === 'bytes' || type === 'string'
  const container = type === 'array' || type === 'map'
  const asString = type === 'string' && !node.invalidUtf8
  // invalid UTF-8 shows as the original bytes (you can probably blame a Go programmer for this)
  const repr = asString ? utf8Encoder.encode(node.value) : bytes.subarray(node.headerEnd, node.end)

  /** @type {string|number} */
  let v
  if (str) {
    v = repr.length
  } else if (type === 'break') {
    v = type
  } else if (container && node.value === Infinity) {
    v = '*'
  } else if (Object.is(node.value, -0)) {
    v = '-0'
  } else {
    v = String(node.value)
  }

  const argument = toHex(bytes.subarray(node.start + 1, node.headerEnd))
  let outp = `${margin}${toHex(bytes.subarray(node.start, node.start + 1))}`
  outp += str || container ? ` ${argument}`.trimEnd() : ` ${argument}`
  outp = outp.padEnd(width / 2, ' ')
  outp += `# ${margin}${type}`
  if (type !== v) {
    outp += `(${v})`
  }
  if (node.tagName) {
    outp += ` ${node.tagName}`
  }
  yield outp

  if (annotation?.note) {
    yield note(annotation.note)
  }

  if (annotation?.embedded) {
    yield * itemLines(bytes, annotation.embedded.items, width, inner.length)
  } else if (annotation?.parts) {
    for (const { start, end, label } of annotation.parts) {
      for (let snip = start; snip < end; snip += wh) {
        const hex = `${inner}${toHex(bytes.subarray(snip, Math.min(snip + wh, end)))}`
        yield snip === start ? `${hex.padEnd(width / 2, ' ')}# ${inner}${label}` : hex
      }
    }
  } else if (str) {
    let snip = 0
    while (repr.length - snip > 0) {
      // at least one byte per line so that the loop always advances
      const end = asString ? utf8SliceEnd(repr, snip, wh) : Math.min(snip + wh, repr.length)
      const piece = repr.slice(snip, end)
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

  if (annotation?.summary) {
    yield note(annotation.summary)
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
