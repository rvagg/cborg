/* eslint-env mocha */

import chai from 'chai'
import { exec } from 'child_process'
import process from 'process'
import path from 'path'
// included here for ipjs compile tree
import bin from '../lib/bin.js' // eslint-disable-line

const { assert } = chai

const binPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../lib/bin.js')

async function execBin (cmd) {
  return new Promise((resolve, reject) => {
    exec(`"${process.execPath}" "${binPath}" ${cmd}`, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout
        err.stderr = stderr
        return reject(err)
      }
      resolve({ stdout, stderr })
    })
  })
}

describe('Bin', () => {
  it('usage', async () => {
    try {
      await execBin('')
      assert.fail('should have errored')
    } catch (e) {
      assert.strictEqual(e.stdout, '')
      assert.strictEqual(e.stderr,
`Usage: cborg <command> <args>
Valid commands:
\thex2diag <hex input>
\thex2json <hex input>
\tjson2hex '<json input>'
`)
    }
  })

  it('help', async () => {
    const { stdout, stderr } = await execBin('help')
    assert.strictEqual(stdout, '')
    assert.strictEqual(stderr,
`Usage: cborg <command> <args>
Valid commands:
\thex2diag <hex input>
\thex2json <hex input>
\tjson2hex '<json input>'
`)
  })

  it('hex2json', async () => {
    const { stdout, stderr } = await execBin('hex2json a3616101616282020365736d696c6564f09f9880')
    assert.strictEqual(stderr, '')
    assert.strictEqual(stdout,
`{
  "a": 1,
  "b": [
    2,
    3
  ],
  "smile": "😀"
}
`)

    try {
      await execBin('hex2json')
      assert.fail('should have errored')
    } catch (e) {
      assert.strictEqual(e.stdout, '')
      assert.isTrue(e.stderr.startsWith('hex2json requires a hexadecimal input string\nUsage: '))
    }
  })

  it('hex2diag', async () => {
    const { stdout, stderr } = await execBin('hex2diag a4616101616282020363627566440102036165736d696c6564f09f9880')
    assert.strictEqual(stderr, '')
    assert.strictEqual(stdout,
`a4                                                # map(4)
  61                                              #   string(1)
    61                                            #     "a"
  01                                              #   uint(1)
  61                                              #   string(1)
    62                                            #     "b"
  82                                              #   array(2)
    02                                            #     uint(2)
    03                                            #     uint(3)
  63                                              #   string(3)
    627566                                        #     "buf"
  44                                              #   bytes(4)
    01020361                                      #     "\\x01\\x02\\x03a"
  65                                              #   string(5)
    736d696c65                                    #     "smile"
  64 f09f                                         #   string(2)
    f09f9880                                      #     "😀"
`)

    try {
      await execBin('hex2diag')
      assert.fail('should have errored')
    } catch (e) {
      assert.strictEqual(e.stdout, '')
      assert.isTrue(e.stderr.startsWith('hex2diag requires a hexadecimal input string\nUsage: '))
    }
  })

  it('json2hex', async () => {
    const { stdout, stderr } = await execBin('json2hex "{\\"a\\":1,\\"b\\":[2,3],\\"smile\\":\\"😀\\"}"')
    assert.strictEqual(stderr, '')
    assert.strictEqual(stdout, 'a3616101616282020365736d696c6564f09f9880\n')

    try {
      await execBin('json2hex')
      assert.fail('should have errored')
    } catch (e) {
      assert.strictEqual(e.stdout, '')
      assert.isTrue(e.stderr.startsWith('json2hex requires a JSON input string\nUsage: '))
    }
  })
})
