import { encode } from './encode.js'
import { decode } from './decode.js'
import assert from 'assert'

function verify (obj) {
  const encd = Buffer.from(encode(obj)).toString()
  const json = JSON.stringify(obj)
  if (encd !== json) {
    console.log('encoded BAD:', encd, '<>', json)
  } else {
    console.log('encoded:', encd)
  }
  const decd = decode(Buffer.from(JSON.stringify(obj)))
  try {
    assert.deepStrictEqual(decd, obj)
    console.log('decoded:', decd)
  } catch (e) {
    console.log('decoded BAD:', decd)
  }
}

verify(true)
verify(false)
verify(null)
verify(100)
verify(-100)
verify(1.11)
verify(-100.11111)
verify(1.11e10)
verify(1.0011111e-18)
verify('this is a string')
verify('this 𝄞 is a ☺☺ string\n\r')
verify('')
console.log('using \\u escapes:', decode(Buffer.from('"this \\uD834\\uDD1E is a \\u263a\\u263a string"')))

/*
verify([1, 2, 3, 'string', true, 4])
verify([1, 2, 3, 'string', true, ['and', 'a', 'nested', 'array', true], 4])
verify({ one: 1, two: 2, three: 3.1, str: 'string', bool: true, four: 4 })
verify({ one: 1, two: 2, three: 3.1, str: 'string', arr: ['and', 'a', 'nested', [], 'array', [true, 1], false], bool: true, obj: { nested: 'object', a: [], o: {} }, four: 4 })
*/
