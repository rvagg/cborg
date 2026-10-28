/* eslint-env mocha */

import * as chai from 'chai'
import { encode, encodeInto } from '../cborg.js'
import { encodedLength } from '../lib/length.js'
import { toHex } from '../lib/byte-utils.js'

const { assert } = chai

/**
 * Evaluate `code` in a separate realm: an iframe in browsers, a node:vm
 * context in Node.js. Returns undefined when neither is available.
 *
 * @returns {Promise<((code: string) => any)|undefined>}
 */
async function foreignRealm () {
  if (typeof document !== 'undefined' && document.body) {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const win = /** @type {any} */ (iframe.contentWindow)
    return (code) => win.eval(code)
  }
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      const specifier = 'node:vm'
      const vm = await import(/* webpackIgnore: true */ specifier)
      return (code) => vm.runInNewContext(code)
    } catch {}
  }
}

describe('cross-realm Uint8Array', () => {
  /** @type {(code: string) => any} */
  let run

  before(async function () {
    const realm = await foreignRealm()
    if (!realm) {
      this.skip()
    }
    run = /** @type {(code: string) => any} */ (realm)
  })

  /**
   * @param {any} foreign
   * @param {any} local
   * @param {string} expectedHex
   */
  function check (foreign, local, expectedHex) {
    assert.strictEqual(toHex(encode(local)), expectedHex)
    assert.strictEqual(toHex(encode(foreign)), expectedHex)
    assert.strictEqual(encodedLength(foreign), expectedHex.length / 2)
    const dest = new Uint8Array(expectedHex.length / 2 + 4)
    const { written } = encodeInto(foreign, dest)
    assert.strictEqual(toHex(dest.subarray(0, written)), expectedHex)
  }

  it('is a different realm', () => {
    assert.isFalse(run('new Uint8Array(1)') instanceof Uint8Array)
  })

  it('plain', () => {
    check(run('new Uint8Array([1, 2, 3])'), Uint8Array.of(1, 2, 3), '43010203')
  })

  it('empty', () => {
    check(run('new Uint8Array(0)'), new Uint8Array(0), '40')
  })

  it('subarray view with offset', () => {
    check(run('new Uint8Array([9, 1, 2, 3, 9]).subarray(1, 4)'), Uint8Array.of(1, 2, 3), '43010203')
  })

  it('nested in object and array', () => {
    const foreign = { a: [run('new Uint8Array([1])'), { b: run('new Uint8Array([2, 3])') }] }
    const local = { a: [Uint8Array.of(1), { b: Uint8Array.of(2, 3) }] }
    check(foreign, local, 'a16161824101a1616242 0203'.replace(' ', ''))
  })
})
