/**
 * Bl is a list of byte chunks, similar to https://github.com/rvagg/bl but for
 * writing rather than reading.
 * A Bl object accepts set() operations for individual bytes and copyTo() for
 * inserting byte arrays. These write operations don't automatically increment
 * the internal cursor so its "length" won't be changed. Instead, increment()
 * must be called to extend its length to cover the inserted data.
 * The toBytes() call will convert all internal memory to a single Uint8Array of
 * the correct length, truncating any data that is stored but hasn't been
 * included by an increment().
 * get() can retrieve a single byte.
 * All operations (except toBytes()) take an "offset" argument that will perform
 * the write at the offset _from the current cursor_. For most operations this
 * will be `0` to write at the current cursor position but it can be ahead of
 * the current cursor. Negative offsets probably work but are untested.
 */

// TODO: ipjs doesn't support this, only for test files: https://github.com/mikeal/ipjs/blob/master/src/package/testFile.js#L39
import { alloc, concat, slice } from './byte-utils.js'

const defaultChunkSize = 1024

class Bl {
  /**
   * @param {number} chunkSize
   */
  constructor (chunkSize = defaultChunkSize) {
    this.chunkSize = chunkSize
    /** @type {number} */
    this.cursor = 0
    /** @type {number} */
    this.maxCursor = -1
    /** @type {Uint8Array[]} */
    this.chunks = []
    // keep the first chunk around if we can to save allocations for future encodes
    /** @type {Uint8Array|null} */
    this._initReuseChunk = null
  }

  reset () {
    this.chunks = []
    this.cursor = 0
    this.maxCursor = -1
    if (this._initReuseChunk !== null) {
      this.chunks.push(this._initReuseChunk)
      this.maxCursor = this._initReuseChunk.length - 1
    }
  }

  // note that this doesn't handle the case where chunkSize is greater than
  // the `offset`
  _growToPos (offset) {
    const pos = this.cursor + offset
    while (pos > this.maxCursor) {
      const allocd = alloc(this.chunkSize)
      this.chunks.push(allocd)
      this.maxCursor += allocd.length
      if (this._initReuseChunk === null) {
        this._initReuseChunk = allocd
      }
    }
    return pos
  }

  /**
   * @param {number} offset
   * @param {number} byte
   */
  set (offset, byte) {
    const pos = this._growToPos(offset)
    let mc = this.maxCursor + 1
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      mc -= this.chunks[i].length
      if (mc <= pos) {
        this.chunks[i][pos - mc] = byte
        return
      }
    }
    /* c8 ignore next 2 */
    // should not get here
    throw new Error('Unexpected internal error')
  }

  /**
   * @param {number} offset
   */
  get (offset) {
    const pos = this._growToPos(offset)
    let mc = this.maxCursor + 1
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      mc -= this.chunks[i].length
      if (mc <= pos) {
        return this.chunks[i][pos - mc]
      }
    }
    /* c8 ignore next 2 */
    // should not get here
    throw new Error('Unexpected internal error')
  }

  /**
   * @param {number} offset
   * @param {Uint8Array} bytes
   */
  copyTo (offset, bytes) {
    const pos = this._growToPos(offset)
    let mc = this.maxCursor + 1
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      mc -= this.chunks[i].length
      if (mc <= pos) {
        const locPos = pos - mc
        if (this.chunks[i].length - locPos >= bytes.length) {
          this.chunks[i].set(bytes, locPos)
          return
        } else { // not enough space in current chunk
          if (locPos === 0) {
            // start of current chunk, need to insert before
            this.chunks.splice(i, 0, bytes)
          } else {
            // middle of current chunk, so split this chunk and insert the new
            // bit inbetween them
            const after = this.chunks[i].subarray(locPos)
            this.chunks[i] = this.chunks[i].subarray(0, locPos)
            this.chunks.splice(i + 1, 0, bytes, after)
          }
          this.maxCursor += bytes.length
          return
        }
      }
    }
    /* c8 ignore next 2 */
    // should not get here
    throw new Error('Unexpected internal error')
  }

  /**
   * @param {number} count
   */
  increment (count) {
    this.cursor += count
  }

  /**
   * @returns {Uint8Array}
   */
  toBytes (reset = false) {
    let byts
    if (this.chunks.length === 1) {
      if (reset && this.cursor > this.chunks[0].length / 2) {
        byts = this.chunks[0].subarray(0, this.cursor)
        this._initReuseChunk = null
        this.chunks = []
      } else {
        byts = slice(this.chunks[0], 0, this.cursor)
      }
    } else {
      byts = concat(this.chunks, this.cursor)
    }
    if (reset) {
      this.reset()
    }
    return byts
  }
}

export default Bl
