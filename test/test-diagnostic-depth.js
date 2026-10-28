/* eslint-env mocha */

import * as chai from 'chai'
import { tokensToDiagnostic, fromDiag } from '../lib/diagnostic.js'
import { fromHex, toHex } from '../lib/byte-utils.js'

const { assert } = chai

/**
 * Collect lines, failing instead of hanging if the generator never finishes.
 * @param {Uint8Array} bytes
 * @param {number} [width]
 * @param {number} [max]
 * @returns {string[]}
 */
function lines (bytes, width, max = 100000) {
  const out = []
  for (const line of tokensToDiagnostic(bytes, width)) {
    out.push(line)
    assert.isBelow(out.length, max, 'diagnostic output did not terminate')
  }
  return out
}

/**
 * @param {number} depth
 * @param {string} leafHex
 */
const nested = (depth, leafHex) => fromHex('81'.repeat(depth) + leafHex)

const leaves = {
  string: '63616263',
  bytes: '43616263'
}

describe('diagnostic depth', () => {
  for (const [kind, leaf] of Object.entries(leaves)) {
    for (const depth of [0, 5, 22, 23, 24, 40, 1000]) {
      for (const width of [undefined, 20, 40, 100, 300]) {
        it(`terminates and prints ${kind} leaf at depth ${depth}, width ${width}`, () => {
          const out = lines(nested(depth, leaf), width, depth + 100)
          const content = out.slice(depth + 1).map((l) => l.match(/"(.*)"$/)[1]).join('')
          assert.strictEqual(content, 'abc')
        })
      }
    }
  }

  it('prints long string content in full at depth', () => {
    const text = 'x'.repeat(500)
    const hex = '81'.repeat(50) + '79' + '01f4' + toHex(new TextEncoder().encode(text))
    const out = lines(fromHex(hex), undefined, 10000)
    const printed = out.slice(51).map((l) => l.match(/"(x*)"$/)[1]).join('')
    assert.strictEqual(printed, text)
  })

  it('output is linear in input size', () => {
    const depth = 5000
    const bytes = nested(depth, '80')
    const total = lines(bytes, undefined, depth + 10).reduce((p, l) => p + l.length + 1, 0)
    assert.isBelow(total, bytes.length * 150)
  })

  it('shallow output is unchanged', () => {
    const bytes = fromHex('81'.repeat(9) + '783c' + toHex(new TextEncoder().encode('y'.repeat(60))))
    assert.deepEqual(lines(bytes), [
      '81                                                # array(1)',
      '  81                                              #   array(1)',
      '    81                                            #     array(1)',
      '      81                                          #       array(1)',
      '        81                                        #         array(1)',
      '          81                                      #           array(1)',
      '            81                                    #             array(1)',
      '              81                                  #               array(1)',
      '                81                                #                 array(1)',
      '                  78 3c                           #                   string(60)',
      '                    7979797979797979797979797979  #                     "yyyyyyyyyyyyyy"',
      '                    7979797979797979797979797979  #                     "yyyyyyyyyyyyyy"',
      '                    7979797979797979797979797979  #                     "yyyyyyyyyyyyyy"',
      '                    7979797979797979797979797979  #                     "yyyyyyyyyyyyyy"',
      '                    79797979                      #                     "yyyy"'
    ])
    assert.deepEqual(lines(bytes, 60), [
      '81                            # array(1)',
      '  81                          #   array(1)',
      '    81                        #     array(1)',
      '      81                      #       array(1)',
      '        81                    #         array(1)',
      '          81                  #           array(1)',
      '            81                #             array(1)',
      '              81              #               array(1)',
      '                81            #                 array(1)',
      '                  78 3c       #                   string(60)',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"',
      '                    79797979  #                     "yyyy"'
    ])
  })

  it('round trips through fromDiag beyond the margin cap', () => {
    for (const leaf of Object.values(leaves)) {
      for (const depth of [5, 24, 1000]) {
        const bytes = nested(depth, leaf)
        assert.strictEqual(toHex(fromDiag(lines(bytes, undefined, depth + 10).join('\n'))), toHex(bytes))
      }
    }
  })
})
