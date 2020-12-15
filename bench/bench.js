import assert from 'assert'
import garbage from '../test/ipld-garbage.js'
import { decode, encode } from '../cborg.js'
import borc from 'borc'

runWith(`rnd-100 x ${(50_000).toLocaleString()}`, 50_000, 100)
runWith(`rnd-300 x ${(10_000).toLocaleString()}`, 10_000, 300)
runWith(`rnd-fil x ${(50_000).toLocaleString()}`, 50_000, 100, { weights: { float: 0, map: 0 } })

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
    process.stdout.write(`\t${desc}:`)
    const borcTime = bofn()
    process.stdout.write(` borc @ ${borcTime.toLocaleString()} ms`)
    const cborgTime = cbfn()
    process.stdout.write(` / cborg @ ${cborgTime.toLocaleString()} ms`)
    process.stdout.write(` = ${Math.round((borcTime / cborgTime) * 1000) / 10} %\n`)
  }

  cmp('encode', () => enc(encode), () => enc(borc.encode))
  cmp('decode', () => dec(decode), () => dec(borc.decode))
}
