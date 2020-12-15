// can be run in a browser with `polendina --runner=bare-sync --timeout 6000 --cleanup bench.js`
// with additional dependencies for cborg installed here

import assert from 'assert'
import garbage from '../test/ipld-garbage.js'
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
  const fixtures = []

  console.log(description)
  for (let i = 0; i < count; i++) {
    const obj = garbage(size, options)
    const cbyts = encode(obj)
    const bbyts = borc.encode(obj)
    if (Buffer.compare(Buffer.from(cbyts), bbyts) !== 0) {
      console.log(`mismatch for obj: ${JSON.stringify(obj)}`)
      console.log('\t', Buffer.from(cbyts).toString('hex'))
      console.log('\t', Buffer.from(bbyts).toString('hex'))
    }
    fixtures.push([obj, cbyts])
  }

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
    write(`\t${desc}:`)
    const borcTime = bofn()
    write(` borc @ ${borcTime.toLocaleString()} ms`)
    const cborgTime = cbfn()
    write(` / cborg @ ${cborgTime.toLocaleString()} ms`)
    write(` = ${(Math.round((borcTime / cborgTime) * 1000) / 10).toLocaleString()} %\n`)
  }

  cmp('encode', () => enc(encode), () => enc(borc.encode))
  cmp('decode', () => dec(decode), () => dec(borc.decode))
}

runWith(`rnd-100 x ${(5000).toLocaleString()}`, 5000, 100)
runWith(`rnd-300 x ${(1000).toLocaleString()}`, 1000, 300)
runWith(`rnd-fil x ${(5000).toLocaleString()}`, 5000, 100, { weights: { float: 0, map: 0 } })
