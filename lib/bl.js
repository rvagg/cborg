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

    copyTo (offset, bytes) {
      const sp = this.curSpace()
      Buffer.prototype.copy.call(bytes, list[cur], curPos + offset, 0, Math.min(bytes.length, sp - offset))
      if (bytes.length > sp - offset) {
        this.grow(bytes.length - (sp - offset))
        Buffer.prototype.copy.call(bytes, list[cur + 1], 0, sp - offset)
      }
    },

    inc (length, noGrow) {
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

module.exports = bl
