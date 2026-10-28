# cborg agent guide

cborg is a fast, strict CBOR encoder and decoder for JavaScript. It is the
engine under `@ipld/dag-cbor` and `@ipld/dag-json`, and through them is used
by IPLD, Filecoin, Bluesky/atproto and other content-addressed systems.

This file is for coding agents and the people driving them. `README.md` is
the API reference. This file is the contract for changing the code.

## Priorities, in order

1. **Correctness.** Output matches the spec byte for byte. Invalid input
   throws. Never coerce, guess or approximate. Cite RFC section numbers when
   a decision rests on the spec.
2. **Determinism.** One value, one byte sequence, by default. Default output
   bytes are a compatibility promise: hashes and signatures depend on them.
   Fixing a broken determinism promise is a bug fix, but it is also a
   breaking change and is marked as one.
3. **Compatibility.** Defaults are sacred. New behaviour is opt-in. Accept
   broad inputs, return precise types. The dag-cbor option profile is the
   first-class customer. Node.js and browsers behave identically.
4. **Performance.** Always want faster. Measured, never assumed. Never bought
   with any of the three above.
5. **Footprint.** Zero runtime dependencies, ever. Small bundles. Unused
   entry points must not leak into the main bundle.

## Who depends on cborg

cborg is a CBOR package, not a dag-cbor package. It supports `@ipld/dag-cbor`
without enforcing its rules out of the box. Decode strictness stays opt-in
because there is a lot of sloppy historic data in the wild.

The dag-cbor profile is the shape to keep in mind for every change:

- encode: `float64: true`, type encoders that emit tag 42 for CIDs and
  reject `Map`, `undefined` and non-finite numbers
- decode: `strict`, `rejectDuplicateMapKeys`, `allowIndefinite: false`,
  `allowNaN: false`, `allowInfinity: false`, `coerceUndefinedToNull`,
  `allowBigInt: true`, a tag 42 decoder

dag-json runs the same decode flags over `cborg/json` with a custom
tokenizer. That is why the `Tokenizer` export and the shared token pipeline
exist. Treat both profiles as regression suites: a change that alters their
bytes or their errors is breaking.

Other defaults that downstream code relies on and must not drift:

- No tags in or out by default. Tags are plugins via `typeEncoders` and
  `tags`.
- `Uint8Array` is the byte type. Not `ArrayBuffer`, not `Buffer`.
- Map keys sort in the legacy RFC 7049 length-first order. RFC 8949 bytewise
  order is `rfc8949EncodeOptions` and stays opt-in. If a new ordering is ever
  added, the old one stays available.
- Integers and lengths encode in their smallest form. Floats encode in their
  smallest form unless `float64` is set. BigInt beyond 64 bits is a tagged
  bignum; within 64 bits it is a plain integer.
- No new ordering, strictness or type behaviour changes an existing default.

## Supported runtimes

- Node.js: lines in Active or Maintenance on the official release schedule,
  nothing older. CI runs `lts/*` and `current` on Linux, macOS and Windows.
  Dropping an end-of-life line is a `chore`. A newer API is fine once every
  supported line has it.
- Browsers: current evergreen desktop and mobile releases. No polyfills, no
  transpiling, no legacy shims in `lib/`. Syntax floor is ES2020 per
  `tsconfig.json`. Browser tests run in headless Chrome, so call out
  Safari-sensitive changes (TextDecoder, typed array views) in the PR.
- Node-only fast paths are allowed only when they are invisible to bundlers.
  See the header of `lib/byte-utils.js` for the pattern.

## Architecture

```text
ENCODE: JS value -> objectToTokens() -> Token tree -> encoder -> bytes
DECODE: bytes -> Tokenizer -> tokensToObject() -> JS value
```

Tokens are the intermediate representation. They let custom encoders, JSON
mode, `encodedLength()` and map key sorting share one code path.

`encode()` and `encodeInto()` take a direct path that skips token
allocation when it can. It falls back to tokens for custom encoders, maps
that need sorting and anything simpler to express as tokens.
`addBreakTokens: true` disables it. The direct path must produce bytes
identical to the token path, and both paths stay tested.

Modules:

- `cborg.js` root entry. `lib/encode.js`, `lib/decode.js` core paths.
- `lib/0uint.js` through `lib/7float.js`, one per CBOR major type, mirrored
  by `test/test-0uint.js` through `test/test-7float.js`.
- `lib/token.js` `Token` and `Type`. `lib/jump.js` decoder jump tables.
  `lib/bl.js` byte writers. `lib/is.js` type detection. `lib/byte-utils.js`
  byte, hex and UTF-8 helpers.
- `lib/tagged.js` one-off tag wrapper. `lib/taglib.js` reusable tag encoders
  and decoders. `lib/extended/` structured-clone-style fidelity.
  `lib/json/` JSON over the same tokens. `lib/length.js` encoded length.
  `lib/diagnostic.js` diagnostic notation. `lib/bin.js` the CLI.
- `interface.ts` is the hand-written source of public types. `types/` is
  `tsc` output, committed, never hand-edited.

Contracts that are easy to get wrong:

- Type encoders return `null` to fall through, a `Token` or nested `Token[]`
  to encode, `[]` to omit, or throw to reject. Recursive encoding goes
  through `objectToTokens(value, options, refStack)` with the `refStack`
  passed on, so custom encoders and cycle detection keep working.
- A tag decoder receives a control object and calls `decode()` or
  `decode.entries()` exactly once.
- Compare token types with `Type.equals(a, b)` anywhere a caller could
  supply tokens. Bundlers can duplicate modules.
- Shared option objects exported from the package are frozen.

## Scope boundaries

- Core is for deterministic, content-addressed data with a minimal type set.
  JavaScript type fidelity (Map, Set, Date, RegExp, typed arrays, always
  tagged BigInt) lives in `cborg/extended` and `cborg/taglib`.
- Prefer exposing a primitive over adding an option when userland can do
  the job with `typeEncoders`, `tags`, `objectToTokens` or a custom
  `Tokenizer`.
- An extension point that costs the common path a branch or a check is
  refused. The hot path is for the user who asked for nothing.
- Everything exported from an entry point is API. Internals stay internal.
- Name things by the spec they implement, not by an adjective.
  `rfc8949EncodeOptions`, not `deterministicEncode`.
- Resolve ambiguity by throwing, not by guessing. Users make their intent
  clear; cborg does not infer it.
- Streaming, async hooks, reference tags and Blob-like types are out of
  scope. Build them above cborg.

## Making a change

1. Read the relevant RFC 8949 section before touching encode or decode
   behaviour. Derive expected bytes by hand or with the `cborg` CLI.
2. Write the test first and check it fails without the change. Cover edge
   cases in both insertion orders for anything involving maps. New byte-level
   behaviour gets a vector in the relevant `test/test-*.js`. Decode changes
   get a run of `test/test-fuzz.js`.
3. Run the focused test file, then `npm test` (lint, type build, Node, CLI,
   browser).
4. For anything under `lib/` on the encode or decode path, benchmark:

   ```bash
   node bench/bench.js --json > /tmp/before.json   # on master
   node bench/bench.js --compare=/tmp/before.json  # on your branch
   ```

   Report the numbers and the runtime in the PR. Small deltas are noise; do
   not claim them. A change that slows the dag-cbor suites needs a reason.
5. Public API or option change: update `interface.ts`, JSDoc, the README
   (a sub-section with a short example), and run `npm run build` to
   regenerate `types/`. Commit the regenerated types with the source.
6. Keep the change to one concern. Do not reformat, rename or tidy
   unrelated code in the same PR.

## Code style

- StandardJS: no semicolons, single quotes, space before function parens.
  Fix lint, never disable it.
- Plain JavaScript with JSDoc types. `checkJs` and `strict` are on.
- Comments are for maintainers, not archaeologists. Describe the code as it
  is now. Never explain what changed, why a line was added, or which issue
  it fixed; that belongs in the commit. No step-by-step narration. Every
  comment earns its place and its word count. Spec links and borrowed-logic
  attribution are welcome.
- Simple language in prose, docs and messages. Short sentences. No waffle.
  Plain punctuation: no em or en dashes, no emoji, no characters that break
  monospace alignment.
- Nothing new at the repository root. Source goes in `lib/`, tests in
  `test/`, benchmarks in `bench/`.
- No runtime dependencies. Dev dependencies need a reason.

## Commits and pull requests

Conventional commits drive release-please's version and changelog PR.
`master` pushes run CI only. rvagg uses a private maintainer command to
verify exact-head CI, merge the prepared PR and create its protected
`vMAJOR.MINOR.PATCH` tag. That tag starts publishing.

| Type | Release |
|------|---------|
| `feat` | minor |
| `fix`, `perf`, `chore`, `docs`, `test`, `revert`, `refactor`, `ci`, `build`, `style` | patch |
| any type with `!` or a `BREAKING CHANGE:` footer | major |

The `no-release` scope has no special meaning to release-please.

- Subject: imperative, lower case, no trailing period, under 72 characters.
  Scopes in use: `encode`, `decode`, `types`, `bench`, `cli`, `extended`,
  `ci`, `deps`.
- Terse and undecorated. No labels, badges or boilerplate.
- Breaking changes carry a `BREAKING CHANGE:` footer that says who is
  affected and how, even when the blast radius is small. Consistency
  matters more than impact.
- A `perf:` commit or PR body carries before/after numbers and the runtime
  they came from.
- PRs are squash-merged and the title becomes the commit subject, so the
  title follows the format above. History is linear.
- `CHANGELOG.md`, the version in `package.json` and
  `.github/release-please-manifest.json` are generated by release-please.
  Never edit them manually.
- Do not change CI, release configuration or package metadata unless that
  is the point of the PR.

Publication uses the immutable Waxseal pin in `.github/workflows/release.yml`.
Publisher implementation and security tests live in the Waxseal repository.

## Keep this file true

When a change makes anything here inaccurate (a module added or renamed, an
export or option changed, a command changed, a rule that no longer holds),
update this file in the same PR. Describe the project as it is. No history,
no change notes.

## References

- RFC 8949, CBOR: https://www.rfc-editor.org/rfc/rfc8949.html
- RFC 7049 section 3.9, the legacy canonical ordering cborg defaults to:
  https://www.rfc-editor.org/rfc/rfc7049.html#section-3.9
- IANA CBOR tags: https://www.iana.org/assignments/cbor-tags/cbor-tags.xhtml
- DAG-CBOR spec: https://ipld.io/specs/codecs/dag-cbor/spec/
- `@ipld/dag-cbor`: https://github.com/ipld/js-dag-cbor
- `@ipld/dag-json`: https://github.com/ipld/js-dag-json
- RFC 8949 Appendix A vectors: `test/appendix_a.js`
- Benchmark workflow: `bench/README.md`
