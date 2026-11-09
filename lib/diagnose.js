import { Tokeniser } from './decode.js'
import { decodeErrPrefix } from './common.js'
import { tagName, decodeCid, bignum, epochDate } from './diagnostic-tags.js'

const utf8Encoder = new TextEncoder()

// Tag 24 content is expanded to this depth, deeper levels are left as bytes
const MAX_EMBED_DEPTH = 16

/**
 * @typedef {object} Annotation What a tag says about its content.
 * @property {string} [note] why the content is not interpreted
 * @property {{ start: number, end: number, label: string }[]} [parts] labelled byte ranges of the content
 * @property {Diagnosis} [embedded] the content decoded as CBOR
 * @property {string} [summary] the content's value as the tag reads it
 */

/**
 * @typedef {object} DiagnosticNode One data item, or the break that ends an
 * indefinite length item. Offsets index the `bytes` of the top-level `Diagnosis`.
 * @property {string} type token type name, as `Type.name`
 * @property {number} start offset of the initial byte
 * @property {number} headerEnd offset after the argument bytes; a string's content runs from here to `end`
 * @property {number} end offset after the item, including its children and break
 * @property {number} depth containers and tags the item sits in; a break sits at its opener's depth
 * @property {any} value the token value: a length for arrays and maps (`Infinity` if indefinite), the number for tags
 * @property {boolean} [invalidUtf8] a text string whose bytes are not valid UTF-8
 * @property {string} [tagName] a tag's name, where known
 * @property {DiagnosticNode[]} [children] array elements, alternating map keys and values, or a tag's content, then any break
 * @property {Annotation} [annotation] set on a tag's content
 */

/**
 * @typedef {object} Diagnosis
 * @property {Uint8Array} bytes
 * @property {DiagnosticNode[]} items
 * @property {{ offset: number, cause: Error }} [error] what stopped decoding; `items` holds what was read before it
 */

/**
 * @callback Interpreter
 * @param {DiagnosticNode} content
 * @param {Uint8Array} bytes
 * @param {number} level tag 24 levels the content is embedded in
 * @returns {Annotation|undefined}
 */

/** @type {Interpreter} */
function epoch (content) {
  if (content.type === 'uint' || content.type === 'negint' || content.type === 'float') {
    const date = epochDate(content.value)
    return date ? { summary: `date(${date})` } : undefined
  }
}

/**
 * @param {2|3} tag
 * @returns {Interpreter}
 */
function bignumOf (tag) {
  return (content) => content.type === 'bytes' ? { summary: `bignum(${bignum(tag, content.value)})` } : undefined
}

/** @type {Interpreter} */
function embeddedCbor (content, bytes, level) {
  if (content.type !== 'bytes') {
    return { note: 'invalid embedded CBOR: content is not a byte string' }
  }
  if (level >= MAX_EMBED_DEPTH) {
    return { note: `embedded CBOR nested deeper than ${MAX_EMBED_DEPTH} levels is not expanded` }
  }
  const embedded = read(bytes, content.headerEnd, content.end, level + 1)
  if (embedded.error) {
    return { note: `invalid embedded CBOR: ${embedded.error.cause.message.replace(`${decodeErrPrefix} `, '')}` }
  }
  return { embedded }
}

/** @type {Interpreter} */
function cid (content) {
  try {
    if (content.type !== 'bytes') {
      throw new Error('content is not a byte string')
    }
    const info = decodeCid(content.value)
    const at = content.headerEnd
    const parts = info.parts.map(({ start, end, label }) => ({ start: at + start, end: at + end, label }))
    return { parts, summary: `CIDv${info.version}(${info.string})` }
  } catch (err) {
    return { note: `invalid CID: ${/** @type {Error} */ (err).message}` }
  }
}

/** @type {Map<number|bigint, Interpreter>} */
const interpreters = new Map([
  [1, epoch],
  [2, bignumOf(2)],
  [3, bignumOf(3)],
  [24, embeddedCbor],
  [42, cid]
])

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
 * Describe CBOR as a tree of items with their byte ranges and tag
 * interpretations. Reads a sequence of items. Decoding stops at the first
 * error, which is returned with the items read before it.
 *
 * @param {Uint8Array} bytes
 * @returns {Diagnosis}
 */
function diagnose (bytes) {
  return read(bytes, 0, bytes.length, 0)
}

/**
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @param {number} end
 * @param {number} level tag 24 levels this range is embedded in, 0 at the top where a sequence of items is allowed
 * @returns {Diagnosis}
 */
function read (bytes, offset, end, level) {
  const tokeniser = new Tokeniser(bytes.subarray(offset, end), { retainStringBytes: true, allowBigInt: true })
  /** @type {DiagnosticNode[]} */
  const items = []
  // open containers and tags, with the items each has still to come, Infinity until its break
  /** @type {{ node: DiagnosticNode, remaining: number }[]} */
  const open = []
  let pos = offset

  try {
    while (!tokeniser.done()) {
      const token = tokeniser.next()
      const type = token.type.name
      const parent = open[open.length - 1]
      if (type === 'break' && parent?.remaining !== Infinity) {
        throw new Error(`${decodeErrPrefix} unexpected break outside an indefinite length item`)
      }
      const start = pos
      // @ts-ignore encodedLength is set on a decode operation
      pos += token.encodedLength
      const headerEnd = type === 'bytes' || type === 'string' || type === 'array' || type === 'map'
        ? start + 1 + argumentSize(bytes[start])
        : pos
      const depth = type === 'break' ? open.length - 1 : open.length
      /** @type {DiagnosticNode} */
      const node = { type, start, headerEnd, end: pos, depth, value: token.value }
      if (type === 'string') {
        node.invalidUtf8 = token.byteValue !== undefined && utf8Encoder.encode(token.value).length !== token.byteValue.length
      }
      if (type === 'tag' && tagName(token.value)) {
        node.tagName = tagName(token.value)
      }
      if (parent?.node.type === 'tag') {
        const annotation = interpreters.get(parent.node.value)?.(node, bytes, level)
        if (annotation) {
          node.annotation = annotation
        }
      }
      if (parent) {
        /** @type {DiagnosticNode[]} */ (parent.node.children).push(node)
      } else {
        items.push(node)
      }

      if (type === 'break') {
        open.pop()
        parent.node.end = pos
      } else if (parent) {
        parent.remaining--
      }
      if (!token.type.terminal) {
        node.children = []
        open.push({ node, remaining: type === 'map' ? token.value * 2 : type === 'array' ? token.value : 1 })
      }
      while (open.length && open[open.length - 1].remaining <= 0) {
        /** @type {{ node: DiagnosticNode }} */ (open.pop()).node.end = pos
      }
      if (level > 0 && !open.length && !tokeniser.done()) {
        throw new Error(`${decodeErrPrefix} more than one data item`)
      }
    }
    if (open.length) {
      pos = end
      throw new Error(`${decodeErrPrefix} not enough data, input ended inside an open item`)
    }
    if (level > 0 && pos === offset) {
      throw new Error(`${decodeErrPrefix} no data item`)
    }
  } catch (err) {
    return { bytes, items, error: { offset: pos, cause: /** @type {Error} */ (err) } }
  }
  return { bytes, items }
}

export { diagnose }
