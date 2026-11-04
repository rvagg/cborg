/**
 * Statistics for bench/compare.js. Pure functions that import nothing, so
 * the module also runs under browser bundling.
 *
 * A "row" is one workload and operation. Each variant is measured once per
 * round in a fresh process, so samples are arrays indexed by round and
 * ratios are taken within a round.
 */

/** A row's delta must exceed this percentage to be flagged. */
export const FLOOR_PERCENT = 3
/** A row's delta must exceed this multiple of the control's MAD to be flagged. */
export const NOISE_MULTIPLE = 3

/**
 * @param {unknown} x
 * @param {string} label
 * @returns {number}
 */
export function assertFinite (x, label) {
  if (typeof x !== 'number' || !Number.isFinite(x)) {
    throw new TypeError(`${label} must be a finite number, got ${String(x)}`)
  }
  return x
}

/**
 * @param {number[]} xs
 * @param {string} label
 */
function assertSamples (xs, label) {
  if (!Array.isArray(xs) || xs.length === 0) {
    throw new TypeError(`${label} must be a non-empty array`)
  }
  xs.forEach((x, i) => assertFinite(x, `${label}[${i}]`))
}

/**
 * @param {number[]} xs
 * @returns {number}
 */
export function median (xs) {
  assertSamples(xs, 'median input')
  const s = xs.slice().sort((a, b) => a - b)
  const h = s.length >> 1
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2
}

/**
 * Median absolute deviation, unscaled.
 *
 * @param {number[]} xs
 * @returns {number}
 */
export function mad (xs) {
  const m = median(xs)
  return median(xs.map((x) => Math.abs(x - m)))
}

/**
 * Element-wise num[i] / den[i]. Throughput must be positive.
 *
 * @param {number[]} num
 * @param {number[]} den
 * @returns {number[]}
 */
export function pairedRatios (num, den) {
  assertSamples(num, 'numerator')
  assertSamples(den, 'denominator')
  if (num.length !== den.length) {
    throw new RangeError(`sample lengths differ: ${num.length} and ${den.length}`)
  }
  return num.map((n, i) => {
    if (n <= 0 || den[i] <= 0) {
      throw new RangeError(`throughput must be positive, got ${n} and ${den[i]} in round ${i}`)
    }
    return n / den[i]
  })
}

/**
 * @param {number[]} xs positive numbers
 * @returns {number}
 */
export function geomean (xs) {
  assertSamples(xs, 'geomean input')
  let sum = 0
  for (const x of xs) {
    if (x <= 0) throw new RangeError(`geomean needs positive numbers, got ${x}`)
    sum += Math.log(x)
  }
  return Math.exp(sum / xs.length)
}

/**
 * @typedef {{ delta: number, noise: number, headRatio: number, controlRatio: number }} RowStats
 */

/**
 * Per-round throughput of each variant for one row.
 * delta is the median head/base change in percent, noise is the MAD of the
 * control/base ratios in percent.
 *
 * @param {{ base: number[], head: number[], control: number[] }} samples
 * @returns {RowStats}
 */
export function rowStats ({ base, head, control }) {
  const headRatio = median(pairedRatios(head, base))
  const controlRatios = pairedRatios(control, base)
  return {
    delta: (headRatio - 1) * 100,
    noise: mad(controlRatios) * 100,
    headRatio,
    controlRatio: median(controlRatios)
  }
}

/**
 * Smallest |delta| in percent that counts as a change given the noise.
 *
 * @param {number} noise percent
 * @returns {number}
 */
export function threshold (noise) {
  assertFinite(noise, 'noise')
  return Math.max(FLOOR_PERCENT, NOISE_MULTIPLE * noise)
}

/**
 * @param {number} delta percent
 * @param {number} noise percent
 * @returns {boolean}
 */
export function isFlagged (delta, noise) {
  assertFinite(delta, 'delta')
  return Math.abs(delta) > threshold(noise)
}

/**
 * A flagged row reproduces when the confirmation data has the same sign and
 * is beyond the threshold computed from that data.
 *
 * @param {{ delta: number }} first
 * @param {{ delta: number, noise: number }} second
 * @returns {boolean}
 */
export function reproduces (first, second) {
  return Math.sign(first.delta) === Math.sign(second.delta) &&
    isFlagged(second.delta, second.noise)
}

/**
 * @typedef {'same'|'improved'|'regressed'|'unconfirmed'} Status
 */

/**
 * @param {{ delta: number, noise: number }} first
 * @param {{ delta: number, noise: number }} [second] confirmation data, when the row was flagged
 * @returns {Status}
 */
export function classify (first, second) {
  if (!isFlagged(first.delta, first.noise)) return 'same'
  if (!second || !reproduces(first, second)) return 'unconfirmed'
  return first.delta > 0 ? 'improved' : 'regressed'
}

/**
 * Geometric mean change in percent per operation, for head and for control.
 *
 * @param {{ op: 'encode'|'decode', headRatio: number, controlRatio: number }[]} rows
 */
export function headline (rows) {
  /** @param {string} op @param {'headRatio'|'controlRatio'} key */
  const gm = (op, key) => {
    const xs = rows.filter((r) => r.op === op).map((r) => r[key])
    return xs.length ? (geomean(xs) - 1) * 100 : 0
  }
  return {
    encode: gm('encode', 'headRatio'),
    decode: gm('decode', 'headRatio'),
    controlEncode: gm('encode', 'controlRatio'),
    controlDecode: gm('decode', 'controlRatio'),
    rows: rows.length
  }
}

/**
 * @param {number} x
 * @returns {number} x rounded to two decimals
 */
export function round2 (x) {
  return Math.round(assertFinite(x, 'value') * 100) / 100 + 0
}
