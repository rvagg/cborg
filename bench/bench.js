import assert from 'assert'
import garbage from '../test/ipld-garbage.js'
import { decode, encode } from '../cborg.js'
import borc from 'borc'


runWith(`rnd-100 x ${(100_000).toLocaleString()}`, 100_000, 100)

function runWith (description, count, size, options) {
  const fixtures = []

  for (let i = 0; i < count; i++) {
    const obj = garbage(size, options) // , { weights: { float: 0 } })
    const cbyts = encode(obj)
    const bbyts = borc.encode(obj)
    if (Buffer.compare(Buffer.from(cbyts), bbyts) !== 0) {
      console.log(`mismatch for obj: ${JSON.stringify(obj)}`)
      console.log('\t', Buffer.from(cbyts).toString('hex'))
      console.log('\t', Buffer.from(bbyts).toString('hex'))
    }
    fixtures.push([obj, cbyts])
  }

  let start = Date.now()
  for (const [obj, byts] of fixtures) {
    const cbyts = encode(obj)
    if (byts.length !== cbyts.length) {
      throw new Error('bork')
    }
  }
  let cborgTime = Date.now() - start
  console.log(`cborg encoded ${fixtures.length.toLocaleString()} objects in ${cborgTime.toLocaleString()} ms`)

  start = Date.now()
  for (const [obj, byts] of fixtures) {
    const bbyts = borc.encode(obj)
    if (byts.length !== bbyts.length) {
      throw new Error('bork')
    }
  }
  let borcTime = Date.now() - start
  console.log(` borc encoded ${fixtures.length.toLocaleString()} objects in ${borcTime.toLocaleString()} ms`)
  console.log(`\tdiff: ${Math.round((borcTime / cborgTime) * 1000) / 10} %`)

  start = Date.now()
  for (const [obj, byts] of fixtures) {
    const cobj = decode(byts)
    if (obj != null) {
      assert.deepStrictEqual(Object.keys(cobj).length, Object.keys(obj).length)
    } else {
      assert(cobj === null)
    }
    // assert.deepStrictEqual(obj, cobj)
  }
  cborgTime = Date.now() - start
  console.log(`cborg decoded ${fixtures.length.toLocaleString()} objects in ${cborgTime.toLocaleString()} ms`)

  start = Date.now()
  for (const [obj, byts] of fixtures) {
    const bobj = borc.decode(byts)
    if (obj != null) {
      assert.deepStrictEqual(Object.keys(bobj).length, Object.keys(obj).length)
    } else {
      assert(bobj === null)
    }
    // assert.deepStrictEqual(obj, bobj)
  }
  borcTime = Date.now() - start
  console.log(` borc decoded ${fixtures.length.toLocaleString()} objects in ${borcTime.toLocaleString()} ms`)
  console.log(`\tdiff: ${Math.round((borcTime / cborgTime) * 1000) / 10} %`)
}
