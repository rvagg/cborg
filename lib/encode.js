import is from '@sindresorhus/is'
import { Token, Type } from './token.js'
import { bl } from './bl.js'
import { encodeErrPrefix } from './common.js'

import { encode as uintEncode } from './0uint.js'
import { encode as negintEncode } from './1negint.js'
import { encode as bytesEncode } from './2bytes.js'
import { encode as stringEncode } from './3string.js'
import { encode as arrayEncode } from './4array.js'
import { encode as mapEncode } from './5map.js'
import { encode as tagEncode } from './6tag.js'
import { encode as floatEncode } from './7float.js'

const encoders = []
encoders[Type.uint.major] = uintEncode
encoders[Type.negint.major] = negintEncode
encoders[Type.bytes.major] = bytesEncode
encoders[Type.string.major] = stringEncode
encoders[Type.array.major] = arrayEncode
encoders[Type.map.major] = mapEncode
encoders[Type.tag.major] = tagEncode
encoders[Type.float.major] = floatEncode

function tokensToArray (obj, refList) {
  const arr = []
  for (const t of objectToTokens(obj, refList)) {
    arr.push(t)
  }
  return arr
}

function * arrayToTokens (arr) {
  for (const t of arr) {
    yield t
  }
}

function * objectToTokens (obj, refList = []) {
  const typ = is(obj)
  if (typ === 'number') {
    if (!Number.isFinite(obj) || obj !== obj || obj > Number.MAX_SAFE_INTEGER || obj % 1 !== 0) { // eslint-disable-line
      yield new Token(Type.float, obj)
    } else if (obj >= 0) {
      yield new Token(Type.uint, obj)
    } else {
      yield new Token(Type.negint, obj)
    }
  } else if (typ === 'bigint') {
    if (obj >= 0n) {
      yield new Token(Type.uint, obj)
    } else {
      yield new Token(Type.negint, obj)
    }
  } else if (typ === 'Uint8Array' || typ === 'Buffer') { // TODO other array buffers?
    yield new Token(Type.bytes, obj)
  } else if (typ === 'string') {
    yield new Token(Type.string, obj)
  } else if (typ === 'Array') {
    yield new Token(Type.array, obj.length)
    for (let i = 0; i < obj.length; i++) {
      yield * objectToTokens(obj[i], refList)
    }
  } else if (typ === 'Object' || typ === 'Map') {
    if (refList.includes(obj)) {
      throw new Error(`${encodeErrPrefix} object contains circular references`)
    }
    refList.push(obj)
    // const entries = sortMapEntries(typ === 'Object' ? Object.entries(obj) : [...obj.entries()])
    const entriesIter = typ === 'Object' ? Object.entries(obj) : obj.entries()
    yield new Token(Type.map, typ === 'Object' ? entriesIter.length : obj.size)
    const entries = []
    for (const [key, value] of entriesIter) {
      entries.push([
        tokensToArray(key, refList),
        tokensToArray(value, refList)
      ])
    }
    sortMapEntries(entries)
    for (const [key, value] of entries) {
      yield * arrayToTokens(key)
      yield * arrayToTokens(value)
    }
  } else if (typ === 'boolean' || typ === 'null' || typ === 'undefined') {
    yield new Token(Type.float, obj)
  } else {
    throw new Error(`${encodeErrPrefix} unsupported type ${typ}`)
  }
}

/*
CBOR key sorting is a mess.

The canonicalisation recommendation from https://tools.ietf.org/html/rfc7049#section-3.9
includes the wording:

> The keys in every map must be sorted lowest value to highest.
> Sorting is performed on the bytes of the representation of the key
> data items without paying attention to the 3/5 bit splitting for
> major types.
> ...
>  *  If two keys have different lengths, the shorter one sorts
      earlier;
>  *  If two keys have the same length, the one with the lower value
      in (byte-wise) lexical order sorts earlier.

1. It is not clear what "bytes of the representation of the key" means: is it
   the CBOR representation, or the binary representation of the object itself?
   Consider the int and uint difference here.
2. It is not clear what "without paying attention to" means: do we include it
   and compare on that? Or do we omit the special prefix byte, (mostly) treating
   the key in its plain binary representation form.

The FIDO 2.0: Client To Authenticator Protocol spec takes the original CBOR
wording and clarifies it according to their understanding.
https://fidoalliance.org/specs/fido-v2.0-rd-20170927/fido-client-to-authenticator-protocol-v2.0-rd-20170927.html#message-encoding

> The keys in every map must be sorted lowest value to highest. Sorting is
> performed on the bytes of the representation of the key data items without
> paying attention to the 3/5 bit splitting for major types. The sorting rules
> are:
>  * If the major types are different, the one with the lower value in numerical
>    order sorts earlier.
>  * If two keys have different lengths, the shorter one sorts earlier;
>  * If two keys have the same length, the one with the lower value in
>    (byte-wise) lexical order sorts earlier.

Some other implementations, such as borc, do a full encode then do a
length-first, byte-wise-second comparison:
https://github.com/dignifiedquire/borc/blob/b6bae8b0bcde7c3976b0f0f0957208095c392a36/src/encoder.js#L358
https://github.com/dignifiedquire/borc/blob/b6bae8b0bcde7c3976b0f0f0957208095c392a36/src/utils.js#L143-L151

This has the benefit of being able to easily handle arbitrary keys, including
complex types (maps and arrays).

We'll opt for the FIDO approach, since it affords some efficies since we don't
need a full encode of each key to determine order and can defer to the types
to determine how to most efficiently order their values (i.e. int and uint
ordering can be done on the numbers, no need for byte-wise, for example).

Recommendation: stick to single key types or you'll get into trouble, and prefer
string keys because it's much simpler that way.
*/
function sortMapEntries (entries) {
  entries.sort((e1, e2) => {
    const keyTokens1 = e1[0]
    const keyTokens2 = e2[0]

    const mcmp = keyTokens1[0].type.compare(keyTokens2[0].type)
    if (mcmp !== 0) {
      return mcmp
    }

    const major = keyTokens1[0].type.major
    if (typeof encoders[major].compareTokens === 'function') {
      // TODO: handle case where cmp === 0 but there are more keyTokens (i.e. complex type)
      const tcmp = encoders[major].compareTokens(keyTokens1[0], keyTokens2[0])
      /* c8 ignore next 5 */
      if (tcmp === 0) {
        // duplicate key or complex type where the first token matched,
        // i.e. a map or array and we're only comparing the opening token
        console.warn('WARNING: complex key types used, CBOR key sorting guarantees are gone')
      }
      return tcmp
    }

    return 0
  })
}

function tokensToEncoded (buf, tokens) {
  for (const token of tokens) {
    const length = encoders[token.type.major](buf, token)
    buf.inc(length)
  }
}

function encode (data) {
  const buf = bl(1024)
  tokensToEncoded(buf, objectToTokens(data))
  return buf.toBytes()
}

export { objectToTokens, tokensToArray, encode }
