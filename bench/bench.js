// can be run in a browser with `polendina --runner=bare-sync --timeout 6000 --cleanup bench.js`
// with additional dependencies for cborg installed here

import assert from 'assert'
import garbage from 'ipld-garbage'
import { decode, encode } from '../cborg.js'
import borc from 'borc'

let writebuf = ''
const write = process.stdout
  ? process.stdout.write.bind(process.stdout)
  : (str) => {
      writebuf += str
      if (str.endsWith('\n')) {
        console.log(writebuf.replace(/\n$/, ''))
        writebuf = ''
      }
    }

function runWith (description, count, size, options) {
  let borcDecoder = null
  const borcDecode = (bytes) => {
    if (!borcDecoder) {
      // account for initial allocation & setup time in benchmark
      borcDecoder = new borc.Decoder({ size: 10 * 1024 * 1024 })
    }
    return borcDecoder.decodeAll(bytes)[0]
  }

  const fixtures = []

  console.log(description)
  for (let i = 0; i < count; i++) {
    const obj = garbage(size, options)
    const cbyts = encode(obj)
    /*
    const bbyts = borc.encode(obj)
    if (Buffer.compare(Buffer.from(cbyts), bbyts) !== 0) {
      console.log(`mismatch for obj: ${JSON.stringify(obj)}`)
      console.log('\t', Buffer.from(cbyts).toString('hex'))
      console.log('\t', Buffer.from(bbyts).toString('hex'))
    }
    */
    if (cbyts.length <= size * 2) {
      fixtures.push([obj, cbyts])
    }
  }
  const avgSize = Math.round(fixtures.reduce((p, c) => p + c[1].length, 0) / fixtures.length)

  const enc = (encoder) => {
    const start = Date.now()
    for (const [obj, byts] of fixtures) {
      const ebyts = encoder(obj)
      if (byts.length !== ebyts.length) {
        throw new Error('bork')
      }
    }
    return Date.now() - start
  }

  const dec = (decoder) => {
    const start = Date.now()
    for (const [obj, byts] of fixtures) {
      const cobj = decoder(byts)
      if (obj != null) {
        assert.deepStrictEqual(Object.keys(cobj).length, Object.keys(obj).length)
      } else {
        assert(cobj === null)
      }
      // assert.deepStrictEqual(obj, cobj)
    }
    return Date.now() - start
  }

  const cmp = (desc, cbfn, bofn) => {
    write(`\t${desc} (avg ${avgSize.toLocaleString()}B):`)
    const borcTime = bofn()
    write(` borc @ ${borcTime.toLocaleString()} ms`)
    const cborgTime = cbfn()
    write(` / cborg @ ${cborgTime.toLocaleString()} ms`)
    write(` = ${(Math.round((borcTime / cborgTime) * 1000) / 10).toLocaleString()} %\n`)
  }

  cmp('encode', () => enc(encode), () => enc(borc.encode))
  cmp('decode', () => dec(decode), () => dec(borcDecode))
}

runWith(`rnd-100 x ${(50000).toLocaleString()}`, 50000, 100, { weights: { CID: 0 } })
runWith(`rnd-300 x ${(50000).toLocaleString()}`, 50000, 300, { weights: { CID: 0 } })
runWith(`rnd-1000 x ${(20000).toLocaleString()}`, 20000, 1000, { weights: { CID: 0 } })
runWith(`rnd-fil-100 x ${(100000).toLocaleString()}`, 100000, 100, { weights: { float: 0, map: 0, CID: 0 } })
runWith(`rnd-fil-300 x ${(100000).toLocaleString()}`, 100000, 300, { weights: { float: 0, map: 0, CID: 0 } })
runWith(`rnd-fil-500 x ${(50000).toLocaleString()}`, 50000, 500, { weights: { float: 0, map: 0, CID: 0 } })
runWith(`rnd-fil-1000 x ${(20000).toLocaleString()}`, 20000, 1000, { weights: { float: 0, map: 0, CID: 0 } })
runWith(`rnd-fil-2000 x ${(10000).toLocaleString()}`, 50000, 2000, { weights: { float: 0, map: 0, CID: 0 } })
runWith(`rnd-nostr-300 x ${(50000).toLocaleString()}`, 50000, 300, { weights: { CID: 0, string: 0 } })
