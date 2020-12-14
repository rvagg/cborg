import is from '@sindresorhus/is'
import { Token, Type } from './token.js'
import Bl from './bl.js'
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

class Ref {
  constructor (obj, parent) {
    this.obj = obj
    this.parent = parent
  }

  includes (obj) {
    let p = this
    do {
      if (p.obj === obj) {
        return true
      }
    } while (p = p.parent) // eslint-disable-line
    return false
  }

  static createCheck (stack, obj) {
    if (stack && stack.includes(obj)) {
      throw new Error(`${encodeErrPrefix} object contains circular references`)
    }
    return new Ref(obj, stack)
  }
}

const typeEncoders = {
  number (obj) {
    if (!Number.isInteger(obj) || obj > Number.MAX_SAFE_INTEGER) {
      return new Token(Type.float, obj)
    } else if (obj >= 0) {
      return new Token(Type.uint, obj)
    } else {
      return new Token(Type.negint, obj)
    }
  },

  bigint (obj) {
    if (obj >= BigInt(0)) {
      return new Token(Type.uint, obj)
    } else {
      return new Token(Type.negint, obj)
    }
  },

  Uint8Array (obj) {
    return new Token(Type.bytes, obj)
  },

  string (obj) {
    return new Token(Type.string, obj)
  },

  boolean (obj) {
    return new Token(Type.float, obj)
  },

  ArrayBuffer (obj) {
    return new Token(Type.bytes, new Uint8Array(obj))
  },

  DataView (obj) {
    return new Token(Type.bytes, new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength))
  },

  Array (obj, _, options, refStack) {
    refStack = Ref.createCheck(refStack, obj)

    const ret = [new Token(Type.array, obj.length)]
    for (let i = 0; i < obj.length; i++) {
      ret.push(objectToTokens(obj[i], options, refStack))
    }
    return ret
  },

  Object (obj, typ, options, refStack) {
    refStack = Ref.createCheck(refStack, obj)

    // could be an Object or a Map
    const entriesIter = typ === 'Object' ? Object.entries(obj) : obj.entries()

    const entries = []
    for (const [key, value] of entriesIter) {
      entries.push([
        // fast-path for most common key type, strings
        is(key) === 'string' ? typeEncoders.string(key) : objectToTokens(key, options, refStack),
        objectToTokens(value, options, refStack)
      ])
    }
    sortMapEntries(entries)

    entries.unshift(new Token(Type.map, typ === 'Object' ? entriesIter.length : obj.size))
    return entries
  }
}

typeEncoders.null = typeEncoders.boolean
typeEncoders.undefined = typeEncoders.boolean
typeEncoders.Map = typeEncoders.Object
typeEncoders.Buffer = typeEncoders.Uint8Array
for (const typ of 'Uint8Clamped Uint16 Uint32 Int8 Int16 Int32 BigUint64 BigInt64 Float32 Float64'.split(' ')) {
  typeEncoders[`${typ}Array`] = typeEncoders.DataView
}

function objectToTokens (obj, options, refStack) {
  const typ = is(obj)
  const typeEncoder = (options && options.typeEncoders && options.typeEncoders[typ]) || typeEncoders[typ]
  if (!typeEncoder) {
    throw new Error(`${encodeErrPrefix} unsupported type: ${typ}`)
  }
  return typeEncoder(obj, typ, options, refStack)
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
  entries.sort(mapSorter)
}

function mapSorter (e1, e2) {
  // the key position ([0]) could have a single token or an array
  // almost always it'll be a single token but complex key might get involved
  /* c8 ignore next 2 */
  const keyToken1 = Array.isArray(e1[0]) ? e1[0][0] : e1[0]
  const keyToken2 = Array.isArray(e2[0]) ? e2[0][0] : e2[0]

  const mcmp = keyToken1.type.compare(keyToken2.type)
  if (mcmp !== 0) {
    return mcmp
  }

  const major = keyToken1.type.major
  // TODO: handle case where cmp === 0 but there are more keyToken e. complex type)
  const tcmp = encoders[major].compareTokens(keyToken1, keyToken2)
  /* c8 ignore next 5 */
  if (tcmp === 0) {
    // duplicate key or complex type where the first token matched,
    // i.e. a map or array and we're only comparing the opening token
    console.warn('WARNING: complex key types used, CBOR key sorting guarantees are gone')
  }
  return tcmp
}

function tokensToEncoded (buf, tokens) {
  const it = (tokens) => {
    for (const token of tokens) {
      enc(token)
    }
  }
  const enc = (token) => {
    if (Array.isArray(token)) {
      it(token)
    } else {
      const length = encoders[token.type.major](buf, token)
      buf.increment(length)
    }
  }
  enc(tokens)
}

function encode (data, options) {
  const buf = new Bl()
  tokensToEncoded(buf, objectToTokens(data, options))
  return buf.toBytes()
}

export { objectToTokens, encode }
