import { encode } from './encode.js'

function verify (obj) {
  const encd = Buffer.from(encode(obj)).toString()
  const json = JSON.stringify(obj)
  if (encd !== json) {
    console.log('BAD:', encd, '<>', json)
  } else {
    console.log(encd)
  }
}

verify(100)
verify(-100)
verify(1.11)
verify(true)
verify(false)
verify(null)
verify('this is a string')
verify([1, 2, 3, 'string', true, 4])
verify([1, 2, 3, 'string', true, ['and', 'a', 'nested', 'array', true], 4])
verify({ one: 1, two: 2, three: 3, str: 'string', bool: true, four: 4 })
verify({ one: 1, two: 2, three: 3, str: 'string', arr: ['and', 'a', 'nested', [], 'array', [true, 1], false], bool: true, obj: { nested: 'object', a: [], o: {} }, four: 4 })
