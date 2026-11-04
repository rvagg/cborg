import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  BOT_LOGIN, MARKER, MAX_BYTES, MAX_ROWS, ValidationError,
  findExisting, parseEventPulls, pickPull, validate
} from '../bench-comment.mjs'
import { renderReport } from '../../../bench/compare-report.js'

const good = () => ({
  schema: 1,
  environment: { node: '26.12.1', platform: 'linux', cpu: 'AMD EPYC 7763 64-Core Processor', rounds: 8, window: 70 },
  rows: [
    { name: 'bsky/posts', op: 'encode', delta: -0.3, noise: 2.3, status: 'same' },
    { name: 'micro/stringsShort', op: 'encode', delta: -9.5, noise: 2.2, status: 'regressed' },
    { name: 'micro/stringsShort', op: 'decode', delta: 4.1, noise: 1, status: 'unconfirmed' }
  ],
  headline: { encode: -3.1, decode: 0.4, controlEncode: 0.2, controlDecode: -0.1, rows: 3 }
})
const check = (mutate) => {
  const r = good()
  mutate(r)
  return JSON.stringify(r)
}
const rejects = (text, re) => assert.throws(() => validate(text), (err) => err instanceof ValidationError && re.test(err.message))

describe('validate', () => {
  it('accepts a well formed result', () => {
    assert.deepEqual(validate(JSON.stringify(good())), good())
  })

  it('accepts a result from the largest allowed row count', () => {
    const r = good()
    r.rows = Array.from({ length: MAX_ROWS }, (_, i) => ({ name: `w/n${i}`, op: 'encode', delta: 0, noise: 0, status: 'same' }))
    r.headline.rows = MAX_ROWS
    assert.equal(validate(JSON.stringify(r)).rows.length, MAX_ROWS)
  })

  it('rejects oversized and unparseable text', () => {
    rejects(' '.repeat(MAX_BYTES + 1), /exceeds/)
    rejects('{nope', /not valid JSON/)
    rejects('null', /must be an object/)
    rejects('[]', /must be an object/)
  })

  it('rejects another schema version and extra or missing fields', () => {
    rejects(check((r) => { r.schema = 2 }), /schema version/)
    rejects(check((r) => { r.schema = '1' }), /schema version/)
    rejects(check((r) => { r.extra = 1 }), /exactly the keys/)
    rejects(check((r) => { delete r.headline }), /exactly the keys/)
    rejects(check((r) => { r.rows[0].note = 'hi' }), /exactly the keys/)
    rejects(check((r) => { r.environment.extra = 'x' }), /exactly the keys/)
    rejects('{"schema":1,"__proto__":{},"environment":{},"rows":[],"headline":{}}', /exactly the keys/)
  })

  it('rejects wrong types and non-finite numbers', () => {
    rejects(check((r) => { r.rows[0].delta = 'NaN' }), /finite number/)
    rejects(check((r) => { r.rows[0].delta = 'Infinity' }), /finite number/)
    rejects(check((r) => { r.rows[0].noise = null }), /finite number/)
    rejects(check((r) => { r.headline.encode = '1' }), /finite number/)
    rejects(check((r) => { r.environment.rounds = '8' }), /finite number/)
    rejects(check((r) => { r.environment.rounds = 8.5 }), /integer/)
    rejects(check((r) => { r.rows = {} }), /array/)
    rejects(check((r) => { r.rows[0] = 'x' }), /must be an object/)
  })

  it('rejects numbers outside sane bounds', () => {
    rejects(check((r) => { r.rows[0].delta = 1e9 }), /within/)
    rejects(check((r) => { r.rows[0].delta = -100.5 }), /within/)
    rejects(check((r) => { r.rows[0].noise = -1 }), /within/)
    rejects(check((r) => { r.environment.window = 0 }), /within/)
  })

  it('rejects too many or no rows', () => {
    const r = good()
    r.rows = Array.from({ length: MAX_ROWS + 1 }, (_, i) => ({ name: `w/n${i}`, op: 'encode', delta: 0, noise: 0, status: 'same' }))
    r.headline.rows = MAX_ROWS + 1
    rejects(JSON.stringify(r), /rows must hold/)
    rejects(check((r) => { r.rows = []; r.headline.rows = 0 }), /rows must hold/)
  })

  it('rejects markup and odd characters in names and environment strings', () => {
    for (const name of ['[x](http://evil)', '<img src=x>', 'a|b', 'a`b', 'a\nb', '', 'x'.repeat(65), 'a:b', 'a\u202eb']) {
      rejects(check((r) => { r.rows[0].name = name }), /name has an unexpected format/)
    }
    rejects(check((r) => { r.environment.cpu = '<script>' }), /cpu/)
    rejects(check((r) => { r.environment.node = '1 2' }), /node/)
    rejects(check((r) => { r.environment.platform = 'Linux' }), /platform/)
  })

  it('rejects unknown op and status values', () => {
    rejects(check((r) => { r.rows[0].op = 'both' }), /op must be/)
    rejects(check((r) => { r.rows[0].status = 'fixed' }), /status must be/)
  })

  it('rejects statuses that contradict the delta', () => {
    rejects(check((r) => { r.rows[1].delta = 5 }), /regressed with a delta/)
    rejects(check((r) => { r.rows[0].status = 'improved'; r.rows[0].delta = -1 }), /improved with a delta/)
  })

  it('rejects repeated rows and a wrong headline row count', () => {
    rejects(check((r) => { r.rows[1].name = r.rows[2].name; r.rows[1].op = r.rows[2].op }), /repeats/)
    rejects(check((r) => { r.headline.rows = 4 }), /headline.rows/)
  })
})

describe('rendered comment', () => {
  it('shows only text the report function writes', () => {
    const md = renderReport(validate(JSON.stringify(good())))
    assert.match(md.split('\n')[0], /^\*\*Benchmark:\*\* encode -3\.1%, decode \+0\.4% over 3 rows/)
    assert.match(md, /`micro\/stringsShort` \| encode \| -9\.5%/)
  })
})

describe('findExisting', () => {
  const c = (id, login, body) => ({ id, login, body })
  it('picks the oldest marked comment by the bot', () => {
    assert.equal(findExisting([
      c(9, BOT_LOGIN, `${MARKER}\nnew`),
      c(3, BOT_LOGIN, `${MARKER}\nold`),
      c(5, BOT_LOGIN, 'unrelated')
    ]), 3)
  })

  it('ignores the marker when someone else wrote it', () => {
    assert.equal(findExisting([
      c(1, 'mallory', `${MARKER}\nfake`),
      c(2, 'github-actions', `${MARKER}\nlookalike login`),
      c(4, BOT_LOGIN, 'no marker')
    ]), null)
  })

  it('returns null for no comments or malformed entries', () => {
    assert.equal(findExisting([]), null)
    assert.equal(findExisting([{ id: 1 }, { id: 2, login: BOT_LOGIN, body: 7 }]), null)
  })
})

describe('pickPull', () => {
  const sha = 'a'.repeat(40)
  const repo = 'rvagg/cborg'
  const pr = (number, over = {}) => ({ number, state: 'open', head: { sha }, base: { repo: { full_name: repo } }, ...over })

  it('returns the single open matching pull request', () => {
    assert.equal(pickPull([pr(7)], sha, repo), 7)
    assert.equal(pickPull([pr(7), pr(8, { state: 'closed' }), pr(9, { head: { sha: 'b'.repeat(40) } })], sha, repo), 7)
  })

  it('refuses none, several, other heads and other base repositories', () => {
    assert.throws(() => pickPull([], sha, repo), /found 0/)
    assert.throws(() => pickPull([pr(7), pr(8)], sha, repo), /found 2/)
    assert.throws(() => pickPull([pr(7, { state: 'closed' })], sha, repo), /found 0/)
    assert.throws(() => pickPull([pr(7, { head: { sha: 'c'.repeat(40) } })], sha, repo), /found 0/)
    assert.throws(() => pickPull([pr(7, { base: { repo: { full_name: 'evil/cborg' } } })], sha, repo), /found 0/)
    assert.throws(() => pickPull([pr('7')], sha, repo), /found 0/)
    assert.throws(() => pickPull([null], sha, repo), /found 0/)
  })
})

describe('parseEventPulls', () => {
  it('takes the first integer pull request number', () => {
    assert.deepEqual(parseEventPulls('[{"number":12},{"number":13}]'), [12])
    assert.deepEqual(parseEventPulls('[]'), [])
    assert.deepEqual(parseEventPulls(''), [])
    assert.deepEqual(parseEventPulls('{"number":1}'), [])
    assert.deepEqual(parseEventPulls('[{"number":"12; rm -rf"},null,{"number":-1}]'), [])
  })
})
