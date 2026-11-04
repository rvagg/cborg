/**
 * Options and workloads shared by the bench/compare.js parent and its
 * workers. Only options present in every supported cborg release are used,
 * so one profile drives both the base and the head tree.
 */

import { generateFixtures, BenchCID } from './fixtures.js'

const FIXTURE_SEED = 12345

/** Mix of small values, too short for the fixture suites to cover. */
const TINY = [{ id: 1, name: 'alice' }, 7, 'hello', [1, 2, 3], { a: { b: [1, 2] } }]

/**
 * @param {any} lib a loaded cborg entry point
 * @param {'dag-cbor'|'raw'} mode
 */
export function makeProfile (lib, mode) {
  const { Token, Type } = lib
  /** @param {any} obj */
  const isCid = (obj) => (obj.asCID === obj || obj['/'] === obj.bytes) && obj instanceof BenchCID

  if (mode === 'raw') {
    return {
      encodeOptions: {
        ignoreUndefinedProperties: true,
        typeEncoders: {
          /** @param {any} obj */
          Object (obj) {
            return isCid(obj) ? [new Token(Type.bytes, obj.bytes)] : null
          }
        }
      },
      decodeOptions: {}
    }
  }

  /** @type {any[]} */
  const tags = []
  tags[42] = (/** @type {() => any} */ decode) => {
    const bytes = decode()
    if (bytes[0] !== 0) throw new Error('Invalid CID for CBOR tag 42')
    return new BenchCID(bytes.subarray(1))
  }
  return {
    encodeOptions: {
      float64: true,
      ignoreUndefinedProperties: true,
      typeEncoders: {
        /** @param {any} obj */
        Object (obj) {
          if (!isCid(obj)) return null
          const bytes = new Uint8Array(obj.bytes.byteLength + 1)
          bytes.set(obj.bytes, 1)
          return [new Token(Type.tag, 42), new Token(Type.bytes, bytes)]
        },
        /** @param {number} n */
        number (n) {
          if (Number.isNaN(n)) throw new Error('NaN is not supported')
          if (n === Infinity || n === -Infinity) throw new Error('Infinity is not supported')
          return null
        }
      }
    },
    decodeOptions: {
      allowIndefinite: false,
      coerceUndefinedToNull: true,
      allowNaN: false,
      allowInfinity: false,
      allowBigInt: true,
      strict: true,
      useMaps: false,
      rejectDuplicateMapKeys: true,
      tags
    }
  }
}

export const SUITES = ['bsky', 'filecoin', 'micro', 'tiny']

/**
 * Workload name to fixture list, in a stable order.
 *
 * @param {string|null} [suite] restrict to one of SUITES
 * @returns {Record<string, any[]>}
 */
export function workloads (suite = null) {
  /** @type {Record<string, any[]>} */
  const out = {}
  for (const [s, group] of Object.entries(generateFixtures(FIXTURE_SEED))) {
    if (suite && suite !== s) continue
    for (const [name, items] of Object.entries(group)) out[`${s}/${name}`] = items
  }
  if (!suite || suite === 'tiny') {
    out['tiny/mixed'] = Array.from({ length: 40 }, (_, i) => TINY[i % TINY.length])
  }
  return out
}
