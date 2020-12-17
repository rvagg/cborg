// excluding #! from here because of ipjs compile, this is called from cli.js

import process from 'process'
import { decode, encode } from '../cborg.js'
import { tokensToDiagnostic } from './diagnostic.js'
import { fromHex, toHex } from './byte-utils.js'

const cmd = process.argv[2]

function usage (code) {
  console.error('Usage: cborg <command> <args>')
  console.error('Valid commands:')
  console.error('\thex2diag <hex input>')
  console.error('\thex2json <hex input>')
  console.error('\tjson2hex \'<json input>\'')
  process.exit(code || 0)
}

if (!cmd) {
  usage(1)
}

if (cmd === 'help') {
  usage(0)
} else if (cmd === 'hex2json') {
  if (process.argv.length < 4) {
    console.error('hex2json requires a hexadecimal input string')
    usage(1)
  }
  const bin = fromHex(process.argv[3])
  console.log(JSON.stringify(decode(bin), null, 2))
} else if (cmd === 'hex2diag') {
  if (process.argv.length < 4) {
    console.error('hex2diag requires a hexadecimal input string')
    usage(1)
  }
  const bin = fromHex(process.argv[3])
  for (const line of tokensToDiagnostic(bin)) {
    console.log(line)
  }
} else if (cmd === 'json2hex') {
  if (process.argv.length < 4) {
    console.error('json2hex requires a JSON input string')
    usage(1)
  }
  const obj = JSON.parse(process.argv[3])
  console.log(toHex(encode(obj)))
}

// for ipjs, to get it to compile
export default true
