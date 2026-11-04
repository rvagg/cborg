/* eslint-env mocha */

import * as chai from 'chai'
import {
  assertFinite, classify, geomean, headline, isFlagged, mad, median,
  pairedRatios, reproduces, rowStats, round2, threshold
} from '../bench/compare-stats.js'
import { renderReport } from '../bench/compare-report.js'

const { assert } = chai

describe('bench compare stats', () => {
  describe('median', () => {
    it('odd, even, single, ties, zeros', () => {
      assert.strictEqual(median([3, 1, 2]), 2)
      assert.strictEqual(median([4, 1, 3, 2]), 2.5)
      assert.strictEqual(median([7]), 7)
      assert.strictEqual(median([5, 5, 5, 1]), 5)
      assert.strictEqual(median([0, 0, 0]), 0)
      assert.strictEqual(median([-1, 0, 1, 2]), 0.5)
    })

    it('does not reorder its input', () => {
      const xs = [3, 1, 2]
      median(xs)
      assert.deepStrictEqual(xs, [3, 1, 2])
    })

    it('rejects empty and non-finite input', () => {
      assert.throws(() => median([]), /non-empty/)
      assert.throws(() => median([1, NaN]), /finite/)
      assert.throws(() => median([1, Infinity]), /finite/)
      assert.throws(() => median([1, '2']), /finite/)
      assert.throws(() => median(null), /non-empty/)
    })
  })

  describe('mad', () => {
    it('is the median absolute deviation from the median', () => {
      assert.strictEqual(mad([1, 2, 3, 4, 100]), 1)
      assert.strictEqual(mad([1, 2, 3, 4]), 1)
      assert.strictEqual(mad([5]), 0)
      assert.strictEqual(mad([2, 2, 2, 2]), 0)
      assert.strictEqual(mad([0, 0, 0]), 0)
    })

    it('ignores a single outlier', () => {
      assert.strictEqual(mad([1, 1, 1, 1, 1000]), 0)
    })
  })

  describe('pairedRatios', () => {
    it('divides within each round', () => {
      assert.deepStrictEqual(pairedRatios([2, 9], [1, 3]), [2, 3])
    })

    it('rejects length mismatch, zero throughput and non-finite values', () => {
      assert.throws(() => pairedRatios([1, 2], [1]), /lengths differ/)
      assert.throws(() => pairedRatios([0], [1]), /positive/)
      assert.throws(() => pairedRatios([1], [0]), /positive/)
      assert.throws(() => pairedRatios([1], [NaN]), /finite/)
      assert.throws(() => pairedRatios([Infinity], [1]), /finite/)
    })
  })

  describe('geomean', () => {
    it('is the geometric mean', () => {
      assert.closeTo(geomean([1, 4]), 2, 1e-12)
      assert.closeTo(geomean([2]), 2, 1e-12)
      assert.closeTo(geomean([0.5, 2]), 1, 1e-12)
    })

    it('rejects zero, negative and non-finite input', () => {
      assert.throws(() => geomean([1, 0]), /positive/)
      assert.throws(() => geomean([1, -1]), /positive/)
      assert.throws(() => geomean([1, NaN]), /finite/)
      assert.throws(() => geomean([]), /non-empty/)
    })
  })

  describe('classification', () => {
    it('threshold is the larger of 3% and 3 x noise', () => {
      assert.strictEqual(threshold(0), 3)
      assert.strictEqual(threshold(1), 3)
      assert.strictEqual(threshold(1.5), 4.5)
      assert.throws(() => threshold(NaN), /finite/)
    })

    it('flags only strictly beyond the floor, either sign', () => {
      assert.isFalse(isFlagged(3, 0))
      assert.isFalse(isFlagged(-3, 0))
      assert.isTrue(isFlagged(3.01, 0))
      assert.isTrue(isFlagged(-3.01, 0))
      assert.isFalse(isFlagged(0, 0))
    })

    it('flags only strictly beyond 3 x noise', () => {
      assert.isFalse(isFlagged(6, 2))
      assert.isTrue(isFlagged(6.01, 2))
      assert.isFalse(isFlagged(-6, 2))
      assert.isTrue(isFlagged(-6.01, 2))
    })

    it('noise widens the threshold above the floor', () => {
      assert.isTrue(isFlagged(5, 0.5))
      assert.isFalse(isFlagged(5, 2))
    })

    it('reproduction needs the same sign and a delta beyond the new threshold', () => {
      assert.isTrue(reproduces({ delta: 5 }, { delta: 4, noise: 0.5 }))
      assert.isFalse(reproduces({ delta: 5 }, { delta: -4, noise: 0.5 }))
      assert.isFalse(reproduces({ delta: 5 }, { delta: 4, noise: 2 }))
      assert.isFalse(reproduces({ delta: 5 }, { delta: 3, noise: 0 }))
      assert.isTrue(reproduces({ delta: -5 }, { delta: -3.5, noise: 0 }))
    })

    it('classifies same, unconfirmed, improved and regressed', () => {
      assert.strictEqual(classify({ delta: 2, noise: 0 }), 'same')
      assert.strictEqual(classify({ delta: 2, noise: 0 }, { delta: 9, noise: 0 }), 'same')
      assert.strictEqual(classify({ delta: 5, noise: 0 }), 'unconfirmed')
      assert.strictEqual(classify({ delta: 5, noise: 0 }, { delta: 1, noise: 0 }), 'unconfirmed')
      assert.strictEqual(classify({ delta: 5, noise: 0 }, { delta: -5, noise: 0 }), 'unconfirmed')
      assert.strictEqual(classify({ delta: 5, noise: 0 }, { delta: 4, noise: 0 }), 'improved')
      assert.strictEqual(classify({ delta: -5, noise: 0 }, { delta: -4, noise: 0 }), 'regressed')
    })
  })

  describe('rowStats', () => {
    it('takes delta from head/base and noise from control/base', () => {
      const base = [100, 100, 100, 100]
      const head = [110, 110, 110, 110]
      const control = [100, 102, 98, 100]
      const s = rowStats({ base, head, control })
      assert.closeTo(s.delta, 10, 1e-9)
      assert.closeTo(s.noise, 1, 1e-9)
      assert.closeTo(s.headRatio, 1.1, 1e-12)
      assert.closeTo(s.controlRatio, 1, 1e-12)
    })

    it('pairs within a round, so shared drift cancels', () => {
      const base = [100, 200, 50, 400]
      const s = rowStats({ base, head: base.slice(), control: base.slice() })
      assert.strictEqual(s.delta, 0)
      assert.strictEqual(s.noise, 0)
    })

    it('rejects non-finite samples', () => {
      assert.throws(() => rowStats({ base: [1, 1], head: [NaN, 1], control: [1, 1] }), /finite/)
    })
  })

  describe('headline', () => {
    it('takes geometric means per op, for head and for control', () => {
      const h = headline([
        { op: 'encode', headRatio: 2, controlRatio: 1 },
        { op: 'encode', headRatio: 0.5, controlRatio: 1.21 },
        { op: 'decode', headRatio: 1.1, controlRatio: 0.9 }
      ])
      assert.closeTo(h.encode, 0, 1e-9)
      assert.closeTo(h.decode, 10, 1e-9)
      assert.closeTo(h.controlEncode, 10, 1e-9)
      assert.closeTo(h.controlDecode, -10, 1e-9)
      assert.strictEqual(h.rows, 3)
    })

    it('reports 0 for an op with no rows', () => {
      assert.strictEqual(headline([{ op: 'encode', headRatio: 1, controlRatio: 1 }]).decode, 0)
    })
  })

  it('round2 rounds, normalises negative zero and rejects non-finite', () => {
    assert.strictEqual(round2(1.2345), 1.23)
    assert.isTrue(Object.is(round2(-0.001), 0))
    assert.throws(() => round2(NaN), /finite/)
    assert.throws(() => assertFinite(Infinity, 'x'), /x must be a finite/)
  })
})

describe('bench compare report', () => {
  const row = (name, op, delta, noise, status) => ({ name, op, delta, noise, status })
  const result = (rows, headline = {}) => ({
    schema: 1,
    environment: { node: '26.0.0', platform: 'linux', cpu: 'Test CPU (R) @ 3.0GHz', rounds: 8, window: 70 },
    rows,
    headline: Object.assign({ encode: 0.4, decode: -0.2, controlEncode: 0.3, controlDecode: -0.5, rows: rows.length }, headline)
  })
  const quiet = [row('bsky/posts', 'encode', 0.4, 0.5, 'same'), row('bsky/posts', 'decode', -0.2, 0.6, 'same')]

  it('opens with a one line headline when nothing changed', () => {
    const md = renderReport(result(quiet))
    assert.strictEqual(md.split('\n')[0], '**Benchmark:** No change beyond noise (control spread +-0.5%)')
    assert.notInclude(md, '| delta | noise |\n|---|---|---:|---:|\n| `')
    assert.include(md, '<details><summary>2 other rows</summary>')
    assert.include(md, 'informational')
    assert.include(md, 'float64: true')
  })

  it('lists improved rows only', () => {
    const md = renderReport(result(quiet.concat(row('micro/mapsSmall', 'encode', 12.34, 0.8, 'improved')), { encode: 5.5, decode: 0.1 }))
    assert.strictEqual(md.split('\n')[0], '**Benchmark:** encode +5.5%, decode +0.1% over 3 rows (control +-0.5%)')
    assert.include(md, '| `micro/mapsSmall` | encode | +12.3% | +-0.8% |')
    assert.include(md, 'Confirmed: 0 regressed, 1 improved.')
  })

  it('lists regressed rows only', () => {
    const md = renderReport(result(quiet.concat(row('micro/mapsSmall', 'decode', -8, 1, 'regressed')), { decode: -4 }))
    assert.include(md, '| `micro/mapsSmall` | decode | -8.0% | +-1.0% |')
    assert.include(md, 'decode -4.0%')
    assert.include(md, 'Confirmed: 1 regressed, 0 improved.')
  })

  it('lists regressed and improved rows together, outside the details block', () => {
    const md = renderReport(result(quiet.concat([
      row('a/b', 'encode', -6, 1, 'regressed'),
      row('c/d', 'decode', 7, 1, 'improved')
    ])))
    const [top, rest] = md.split('<details>')
    assert.include(top, '`a/b`')
    assert.include(top, '`c/d`')
    assert.notInclude(top, 'bsky/posts')
    assert.include(rest, 'bsky/posts')
  })

  it('keeps unconfirmed rows in the details block and says so', () => {
    const md = renderReport(result(quiet.concat(row('x/y', 'encode', 9, 1, 'unconfirmed'))))
    assert.strictEqual(md.split('\n')[0], '**Benchmark:** No change beyond noise (control spread +-0.5%)')
    assert.include(md, 'Unconfirmed: 1.')
    assert.include(md.split('<details>')[1], '| `x/y` | encode | +9.0% | +-1.0% | unconfirmed |')
  })

  it('escapes markup in names and environment strings', () => {
    const r = result([row('a|b`[x](http://e)<img>', 'encode', 5, 1, 'regressed')])
    r.environment.cpu = '<script>'
    const md = renderReport(r)
    assert.notInclude(md, '<img>')
    assert.notInclude(md, '<script>')
    assert.notInclude(md, '|b`')
  })

  it('keeps environment text in code spans so mentions and links are inert', () => {
    const r = result(quiet)
    r.environment.node = 'www.evil.example.com'
    r.environment.cpu = '@rvagg mail@evil.com'
    const line = renderReport(r).split('\n').find((l) => l.startsWith('Node '))
    assert.include(line, '`www.evil.example.com`')
    assert.include(line, '`@rvagg mail@evil.com`')
  })

  it('rejects non-finite numbers and foreign shapes', () => {
    assert.throws(() => renderReport(result([row('a', 'encode', NaN, 1, 'same')])), /finite/)
    assert.throws(() => renderReport(result([row('a', 'encode', 1, Infinity, 'same')])), /finite/)
    assert.throws(() => renderReport(result(quiet, { controlEncode: NaN })), /finite/)
    assert.throws(() => renderReport(result(quiet, { encode: '1' })), /finite/)
    assert.throws(() => renderReport({ schema: 2, rows: [] }), /schema 1/)
    assert.throws(() => renderReport(null), /schema 1/)
  })
})
