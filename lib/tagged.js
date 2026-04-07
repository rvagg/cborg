/**
 * @typedef {import('../interface.js').TagDecodeControl} TagDecodeControl
 * @typedef {(decode: TagDecodeControl) => Tagged} TaggedTagDecoder
 */

/**
 * A wrapper class for representing a CBOR tag with an arbitrary nested value.
 *
 * `Tagged` is a symmetric primitive: it can be passed to `encode()` to emit
 * a CBOR tag header followed by the encoded form of `value`, and it can be
 * returned from a tag decoder (via `Tagged.decoder(tag)` or `Tagged.preserve()`)
 * to round-trip a tag through decode without losing the tag number.
 *
 * Use `Tagged` for one-off tag handling where defining a dedicated
 * `typeEncoders` entry and tag decoder pair would be heavyweight, e.g. when
 * wrapping a structure in a single application-specific tag (COSE, dCBOR
 * envelopes, etc.).
 *
 * For systematic mapping of a JS type to a tag (e.g. CID -> tag 42), prefer
 * a dedicated `typeEncoders` entry instead.
 */
export class Tagged {
  /**
   * @param {number} tag - CBOR tag number, a non-negative integer
   * @param {any} value - The value to be tagged; encoded recursively
   */
  constructor (tag, value) {
    if (typeof tag !== 'number' || !Number.isInteger(tag) || tag < 0) {
      throw new TypeError('Tagged: tag must be a non-negative integer')
    }
    this.tag = tag
    this.value = value
  }

  /**
   * Build a tag decoder for use in `decode()`'s `tags` option that returns the
   * decoded content wrapped in a `Tagged` instance, preserving the tag number
   * for the caller to inspect.
   *
   * @param {number} tag - The CBOR tag number this decoder will be registered for
   * @returns {TaggedTagDecoder}
   *
   * @example
   * import { decode, Tagged } from 'cborg'
   * const value = decode(bytes, { tags: { 16: Tagged.decoder(16) } })
   * // value instanceof Tagged; value.tag === 16
   */
  static decoder (tag) {
    return (decode) => new Tagged(tag, decode())
  }

  /**
   * Build a `tags` option for `decode()` that wraps each listed tag number in
   * a `Tagged` instance, preserving those tags through decode without
   * registering a dedicated decoder per tag.
   *
   * @param {...number} tagNumbers - One or more CBOR tag numbers to preserve
   * @returns {{[tagNumber: number]: TaggedTagDecoder}}
   *
   * @example
   * import { decode, Tagged } from 'cborg'
   * const value = decode(bytes, { tags: Tagged.preserve(16, 96) })
   */
  static preserve (...tagNumbers) {
    /** @type {{[tagNumber: number]: TaggedTagDecoder}} */
    const tags = {}
    for (const tag of tagNumbers) {
      tags[tag] = Tagged.decoder(tag)
    }
    return tags
  }
}

// Symbol.toStringTag so the internal `is()` type detection returns 'Tagged'
// for instances, allowing the default Tagged typeEncoder to match.
Object.defineProperty(Tagged.prototype, Symbol.toStringTag, {
  value: 'Tagged'
})
