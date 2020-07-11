// a list of buffers, similar to https://github.com/rvagg/bl but for writing

function bl (size) {
  const list = [Buffer.alloc(size)]
  let cur = 0
  let curPos = 0

  const buf = {
    grow (s = size) {
      list.push(Buffer.alloc(s))
    },

    set (offset, byte) {
      list[cur][curPos + offset] = byte
    },

    get (offset) {
      return list[cur][curPos + offset]
    },

    copyTo (offset, bytes, length) {
      let isString = typeof bytes === 'string'

      if (isString && length > (list[cur].length - (curPos + offset))) {
        // we know it's not going to fit in the current buf so we may as well
        // convert here to save a partial write() and then full conversion later.
        bytes = Buffer.from(bytes, 'utf8')
        isString = false
      }

      let copied
      if (!isString) {
        copied = Buffer.prototype.copy.call(
          bytes,
          list[cur],
          curPos + offset,
          0,
          length)
      } else {
        // TODO: check that the performance of this is worth the hassle
        copied = Buffer.prototype.write.call(list[cur], bytes, curPos + offset, length)
      }

      if (copied < length) {
        this.grow(length - copied)
        // should not be here if `isString===true`
        Buffer.prototype.copy.call(bytes, list[cur + 1], 0, copied)
      }

      return length
    },

    inc (length, noGrow) {
      if (!(length > 0)) {
        throw new Error(`inc(${length})`)
      }
      curPos += length
      let sp = this.curSpace()
      if (sp < 0) { // out of space
        curPos -= list[cur].length
        cur++
        sp = this.curSpace()
      }
      if (sp === 0 && !noGrow) { // hit the boundary, haven't added more
        this.grow()
        curPos = 0
        cur++
      }
    },

    curSpace () {
      return list[cur].length - curPos
    },

    toBuffer () {
      if (curPos === 0) {
        list.pop()
      } else {
        list[cur] = list[cur].slice(0, curPos)
      }
      return Buffer.concat(list)
    }
  }

  return buf
}

export { bl }
