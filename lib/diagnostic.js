import { encodedToTokens } from './decode.js'

function * tokensToDiagnostic (inp, width = 100) {
  const tokenIter = encodedToTokens(inp)
  let pos = 0
  const indent = []

  const slc = (start, length) => {
    return inp.slice(pos + start, pos + start + length).toString('hex')
  }

  for (const token of tokenIter) {
    let margin = ''.padStart(indent.length * 2, ' ')
    let vLength = token.encodedLength - 1
    let v = String(token.value)
    const str = token.type.name === 'bytes' || token.type.name === 'string'
    if (str) {
      vLength -= v.length
      v = v.length
    }

    let outp = `${margin}${slc(0, 1)} ${slc(1, vLength)}`

    outp = outp.padEnd(width / 2, ' ')
    outp += `# ${margin}${token.type.name}`
    if (token.type.name !== v) {
      outp += `(${v})`
    }
    yield outp

    if (str) {
      margin += '  '
      const repr = token.type.name === 'bytes' ? token.value : Buffer.from(token.value, 'utf8')
      const wh = ((width / 2) - margin.length - 1) / 2
      let snip = 0
      while (repr.length - snip > 0) {
        const piece = repr.slice(snip, snip + wh)
        snip += piece.length
        // the assumption that we can utf8 a byte-sliced version is a stretch,
        // we could be slicing in the middle of a multi-byte character
        const st = token.type.name === 'string' ? piece.toString('utf8') : piece.reduce((p, c) => {
          if (c < 0x20 || c === 0x7f) {
            return `${p}\\x${c.toString(16).padStart(2, '0')}`
          }
          return `${p}${String.fromCharCode(c)}`
        }, '')
        yield `${margin}${Buffer.from(piece).toString('hex')}`.padEnd(width / 2, ' ') + `# ${margin}"${st}"`
      }
    }

    if (!token.type.terminal) {
      indent.push(token.type.name === 'map' ? token.value * 2 : token.value)
    } else {
      if (indent.length) {
        indent[indent.length - 1]--
        if (indent[indent.length - 1] === 0) {
          indent.pop()
        }
      }
    }
    pos += token.encodedLength
  }
}

export { tokensToDiagnostic }
