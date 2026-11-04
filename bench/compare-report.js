/**
 * Markdown for a bench/compare.js result. Pure function, imports
 * only compare-stats.js. Every string from the result is escaped before it is
 * placed in the output.
 */

import { assertFinite, FLOOR_PERCENT } from './compare-stats.js'

/**
 * @param {number} x
 * @returns {string} signed percentage, one decimal
 */
function pct (x) {
  const s = assertFinite(x, 'percentage').toFixed(1)
  return (x > 0 && s !== '0.0' ? '+' : '') + (s === '-0.0' ? '0.0' : s) + '%'
}

/**
 * Keep only characters that are safe in a table cell and in inline code.
 * Callers place the result inside a code span, where GitHub does not turn
 * `@name` into a mention or `www.` text into a link.
 *
 * @param {unknown} s
 * @returns {string}
 */
function plain (s) {
  return String(s).replace(/[^A-Za-z0-9_/ .()@+-]/g, '?')
}

/**
 * @param {any[]} rows
 * @param {boolean} withStatus
 * @returns {string[]}
 */
function table (rows, withStatus) {
  const head = withStatus
    ? ['| workload | op | delta | noise | status |', '|---|---|---:|---:|---|']
    : ['| workload | op | delta | noise |', '|---|---|---:|---:|']
  return head.concat(rows.map((r) => {
    const cells = [`\`${plain(r.name)}\``, plain(r.op), pct(r.delta), `+-${assertFinite(r.noise, 'noise').toFixed(1)}%`]
    if (withStatus) cells.push(plain(r.status))
    return `| ${cells.join(' | ')} |`
  }))
}

/**
 * @param {any} result a schema 1 result
 * @returns {string}
 */
export function renderReport (result) {
  if (!result || result.schema !== 1 || !Array.isArray(result.rows)) {
    throw new TypeError('not a schema 1 result')
  }
  const h = result.headline
  const env = result.environment
  for (const k of ['encode', 'decode', 'rows']) assertFinite(h[k], k)
  const control = Math.max(Math.abs(assertFinite(h.controlEncode, 'controlEncode')), Math.abs(assertFinite(h.controlDecode, 'controlDecode')))
  const regressed = result.rows.filter((/** @type {any} */ r) => r.status === 'regressed')
  const improved = result.rows.filter((/** @type {any} */ r) => r.status === 'improved')
  const rest = result.rows.filter((/** @type {any} */ r) => r.status !== 'regressed' && r.status !== 'improved')
  const unconfirmed = rest.filter((/** @type {any} */ r) => r.status === 'unconfirmed').length

  const lines = []
  if (regressed.length + improved.length === 0) {
    lines.push(`**Benchmark:** No change beyond noise (control spread +-${control.toFixed(1)}%)`)
  } else {
    lines.push(`**Benchmark:** encode ${pct(h.encode)}, decode ${pct(h.decode)} over ${h.rows} rows (control +-${control.toFixed(1)}%)`)
  }
  lines.push('')
  lines.push(`Throughput change, head against base, geometric mean per operation. Confirmed: ${regressed.length} regressed, ${improved.length} improved. Unconfirmed: ${unconfirmed}.`)

  const changed = regressed.concat(improved)
  if (changed.length) {
    lines.push('', ...table(changed, false))
  }
  if (rest.length) {
    lines.push('', `<details><summary>${rest.length} other rows</summary>`, '', ...table(rest, true), '', '</details>')
  }
  lines.push(
    '',
    `Node \`${plain(env.node)}\` on \`${plain(env.platform)}\`, \`${plain(env.cpu)}\`. ${assertFinite(env.rounds, 'rounds')} rounds of ${assertFinite(env.window, 'window')} ms, one fresh process per variant per round.`,
    '',
    'This comparison is informational and the check passes regardless of the result.',
    '',
    'Outside what this run can see:',
    `- changes under about ${FLOOR_PERCENT}%, which are indistinguishable from noise`,
    '- browsers, only Node is measured',
    '- float rows, the dag-cbor profile sets `float64: true`'
  )
  return lines.join('\n') + '\n'
}
