/**
 * Byte writers for encoding: FlatWriter, the default, and U8Writer, which writes into a
 * caller-provided Uint8Array.
 */

/**
 * @typedef {import('../interface.js').ByteView} ByteView
 * @typedef {import('../interface.js').AllocatedByteView} AllocatedByteView
 */

const FLAT_INIT = 2048
// a single buffer doubles up to this size, then output continues in segments
const FLAT_LIMIT = 262144
// byte arrays this long are referenced as their own segment, not copied
const FLAT_LARGE = 1024
// buffers up to this size survive reset() for reuse
const FLAT_RETAIN = 65536

/**
 * FlatWriter is the default encode writer. It appends to one growing Uint8Array
 * rather than a list of chunks. Large byte arrays are held by reference as
 * separate segments and are copied once, by toBytes().
 * toBytes() always returns a new, exact-size Uint8Array, so the result never
 * aliases the writer, its inputs or a Node.js Buffer pool.
 *
 * `pushArr()` takes a `number[]` and `pushBytes()` a `Uint8Array`. Hot call
 * sites use these directly so each stays monomorphic; `push()` dispatches for
 * everyone else.
 */
export class FlatWriter {
  constructor () {
    this.home = new Uint8Array(FLAT_INIT)
    this.buf = this.home
    /** @type {number} */
    this.pos = 0
    // start of bytes in `buf` not yet moved into `segs`
    /** @type {number} */
    this.start = 0
    /** @type {Uint8Array[]} */
    this.segs = []
    /** @type {number} */
    this.segLen = 0
  }

  reset () {
    // keep a buffer that has grown to fit typical messages, drop big ones
    if (this.buf.length > this.home.length && this.buf.length <= FLAT_RETAIN) {
      this.home = this.buf
    }
    this.buf = this.home
    this.pos = 0
    this.start = 0
    if (this.segs.length > 0) {
      this.segs = []
      this.segLen = 0
    }
  }

  /**
   * Make room for `need` more bytes.
   * @param {number} need
   */
  grow (need) {
    const open = this.pos - this.start
    if (this.buf.length >= FLAT_LIMIT) {
      if (open > 0) {
        this.segs.push(this.buf.subarray(this.start, this.pos))
        this.segLen += open
      }
      this.buf = new Uint8Array(need > FLAT_LIMIT ? need : FLAT_LIMIT)
      this.pos = 0
      this.start = 0
    } else {
      let size = this.buf.length * 2
      while (size < open + need) size *= 2
      const nb = new Uint8Array(size)
      nb.set(this.buf.subarray(this.start, this.pos))
      this.buf = nb
      this.pos = open
      this.start = 0
    }
  }

  /**
   * @param {number} byte
   */
  pushByte (byte) {
    if (this.pos >= this.buf.length) this.grow(1)
    this.buf[this.pos++] = byte
  }

  /**
   * @param {number[]} arr
   */
  pushArr (arr) {
    const n = arr.length
    if (this.pos + n > this.buf.length) this.grow(n)
    const b = this.buf
    let c = this.pos
    for (let i = 0; i < n; i++) b[c++] = arr[i]
    this.pos = c
  }

  /**
   * @param {ByteView} bytes
   */
  pushBytes (bytes) {
    const n = bytes.length
    if (n >= FLAT_LARGE) {
      if (this.pos > this.start) {
        this.segs.push(this.buf.subarray(this.start, this.pos))
        this.segLen += this.pos - this.start
      }
      this.segs.push(bytes)
      this.segLen += n
      this.start = this.pos
      return
    }
    if (this.pos + n > this.buf.length) this.grow(n)
    const b = this.buf
    let c = this.pos
    if (n < 16) {
      for (let i = 0; i < n; i++) b[c++] = bytes[i]
    } else {
      b.set(bytes, c)
      c += n
    }
    this.pos = c
  }

  /**
   * @param {ByteView|number[]} bytes
   */
  push (bytes) {
    if (Array.isArray(bytes)) this.pushArr(bytes)
    else this.pushBytes(bytes)
  }

  /**
   * @param {boolean} [reset]
   * @returns {AllocatedByteView}
   */
  toBytes (reset = false) {
    let out
    if (this.segs.length === 0) {
      out = new Uint8Array(this.buf.subarray(this.start, this.pos))
    } else {
      out = new Uint8Array(this.segLen + (this.pos - this.start))
      let off = 0
      for (const seg of this.segs) {
        out.set(seg, off)
        off += seg.length
      }
      out.set(this.buf.subarray(this.start, this.pos), off)
    }
    if (reset) this.reset()
    return out
  }
}

/**
 * U8Writer writes directly to a user-provided Uint8Array. It has the same
 * interface as FlatWriter but writes to a fixed destination and throws on overflow.
 * @template {ArrayBufferLike} T
 */
export class U8Writer {
  /**
   * @param {Uint8Array<T>} dest
   */
  constructor (dest) {
    this.dest = dest
    /** @type {number} */
    this.cursor = 0
  }

  reset () {
    this.cursor = 0
  }

  /**
   * @param {number} byte
   */
  pushByte (byte) {
    if (this.cursor >= this.dest.length) {
      throw new Error('write out of bounds, destination buffer is too small')
    }
    this.dest[this.cursor++] = byte
  }

  /**
   * @param {ByteView|number[]} bytes
   */
  push (bytes) {
    if (this.cursor + bytes.length > this.dest.length) {
      throw new Error('write out of bounds, destination buffer is too small')
    }
    this.dest.set(bytes, this.cursor)
    this.cursor += bytes.length
  }

  /**
   * @param {number[]} bytes
   */
  pushArr (bytes) {
    const n = bytes.length
    if (this.cursor + n > this.dest.length) {
      throw new Error('write out of bounds, destination buffer is too small')
    }
    const dest = this.dest
    let c = this.cursor
    for (let i = 0; i < n; i++) dest[c++] = bytes[i]
    this.cursor = c
  }

  /**
   * @param {ByteView} bytes
   */
  pushBytes (bytes) {
    this.push(bytes)
  }

  /**
   * @param {boolean} [reset]
   * @returns {Uint8Array<T>}
   */
  toBytes (reset = false) {
    const byts = this.dest.subarray(0, this.cursor)
    if (reset) {
      this.reset()
    }
    return byts
  }
}
