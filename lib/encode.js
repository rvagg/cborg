import is from './is.js'
import { Token, Type } from './token.js'
import Bl from './bl.js'
import { encodeErrPrefix } from './common.js'
import { quickEncodeToken } from './jump.js'
import { asU8A } from './byte-utils.js'

import { encodeUint } from './0uint.js'
import { encodeNegint } from './1negint.js'
import { encodeBytes } from './2bytes.js'
import { encodeString } from './3string.js'
import { encodeArray } from './4array.js'
import { encodeMap } from './5map.js'
import { encodeTag } from './6tag.js'
import { encodeFloat } from './7float.js'

const defaultEncodeOptions = {
  float64: false,
  mapSorter,
  quickEncodeToken
}

const cborEncoders = []
cborEncoders[Type.uint.major] = encodeUint
cborEncoders[Type.negint.major] = encodeNegint
cborEncoders[Type.bytes.major] = encodeBytes
cborEncoders[Type.string.major] = encodeString
cborEncoders[Type.array.major] = encodeArray
cborEncoders[Type.map.major] = encodeMap
cborEncoders[Type.tag.major] = encodeTag
cborEncoders[Type.float.major] = encodeFloat

const buf = new Bl()

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

const simpleTokens = {
  null: new Token(Type.null, null),
  undefined: new Token(Type.undefined, undefined),
  true: new Token(Type.true, true),
  false: new Token(Type.false, false),
  emptyArray: new Token(Type.array, 0),
  emptyMap: new Token(Type.map, 0)
}

const typeEncoders = {
  number (obj) {
    if (!Number.isInteger(obj) || !Number.isSafeInteger(obj)) {
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
    return obj ? simpleTokens.true : simpleTokens.false
  },

  null () {
    return simpleTokens.null
  },

  undefined () {
    return simpleTokens.undefined
  },

  ArrayBuffer (obj) {
    return new Token(Type.bytes, new Uint8Array(obj))
  },

  DataView (obj) {
    return new Token(Type.bytes, new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength))
  },

  Array (obj, _, options, refStack) {
    if (!obj.length && options.addBreakTokens !== true) {
      return simpleTokens.emptyArray
    }
    refStack = Ref.createCheck(refStack, obj)
    const entries = []
    let i = 0
    for (const e of obj) {
      entries[i++] = objectToTokens(e, options, refStack)
    }
    return [new Token(Type.array, obj.length), entries, new Token(Type.break)]
  },

  Object (obj, typ, options, refStack) {
    // could be an Object or a Map
    const isMap = typ !== 'Object'
    // it's slightly quicker to use Object.keys() than Object.entries()
    const keys = isMap ? obj.keys() : Object.keys(obj)
    const length = isMap ? obj.size : keys.length
    if (!length && options.addBreakTokens !== true) {
      return simpleTokens.emptyMap
    }
    refStack = Ref.createCheck(refStack, obj)
    const entries = []
    let i = 0
    for (const key of keys) {
      entries[i++] = [
        objectToTokens(key, options, refStack),
        objectToTokens(isMap ? obj.get(key) : obj[key], options, refStack)
      ]
    }
    sortMapEntries(entries, options)
    return [new Token(Type.map, length), entries, new Token(Type.break)]
  }
}

typeEncoders.Map = typeEncoders.Object
typeEncoders.Buffer = typeEncoders.Uint8Array
for (const typ of 'Uint8Clamped Uint16 Uint32 Int8 Int16 Int32 BigUint64 BigInt64 Float32 Float64'.split(' ')) {
  typeEncoders[`${typ}Array`] = typeEncoders.DataView
}

function objectToTokens (obj, options = {}, refStack) {
  const typ = is(obj)
  const customTypeEncoder = (options && options.typeEncoders && options.typeEncoders[typ]) || typeEncoders[typ]
  if (typeof customTypeEncoder === 'function') {
    const tokens = customTypeEncoder(obj, typ, options, refStack)
    if (tokens != null) {
      return tokens
    }
  }
  const typeEncoder = typeEncoders[typ]
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

/*
(UPDATE, Dec 2020)
https://tools.ietf.org/html/rfc8949 is the updated CBOR spec and clarifies some
of the questions above with a new recommendation for sorting order being much
closer to what would be expected in other environments (i.e. no length-first
weirdness).
This new sorting order is not yet implemented here but could be added as an
option. "Determinism" (canonicity) is system dependent and it's difficult to
change existing systems that are built with existing expectations. So if a new
ordering is introduced here, the old needs to be kept as well with the user
having the option.
*/

function sortMapEntries (entries, options) {
  if (options.mapSorter) {
    entries.sort(options.mapSorter)
  }
}

function mapSorter (e1, e2) {
  // the key position ([0]) could have a single token or an array
  // almost always it'll be a single token but complex key might get involved
  /* c8 ignore next 2 */
  const keyToken1 = Array.isArray(e1[0]) ? e1[0][0] : e1[0]
  const keyToken2 = Array.isArray(e2[0]) ? e2[0][0] : e2[0]

  // different key types
  if (keyToken1.type !== keyToken2.type) {
    return keyToken1.type.compare(keyToken2.type)
  }

  const major = keyToken1.type.major
  // TODO: handle case where cmp === 0 but there are more keyToken e. complex type)
  const tcmp = cborEncoders[major].compareTokens(keyToken1, keyToken2)
  /* c8 ignore next 5 */
  if (tcmp === 0) {
    // duplicate key or complex type where the first token matched,
    // i.e. a map or array and we're only comparing the opening token
    console.warn('WARNING: complex key types used, CBOR key sorting guarantees are gone')
  }
  return tcmp
}

function tokensToEncoded (buf, tokens, encoders, options) {
  if (Array.isArray(tokens)) {
    for (const token of tokens) {
      tokensToEncoded(buf, token, encoders, options)
    }
  } else {
    encoders[tokens.type.major](buf, tokens, options)
  }
}

function encodeCustom (data, encoders, options) {
  const tokens = objectToTokens(data, options)
  if (!Array.isArray(tokens) && options.quickEncodeToken) {
    const quickBytes = options.quickEncodeToken(tokens)
    if (quickBytes) {
      return quickBytes
    }
    const encoder = encoders[tokens.type.major]
    if (encoder.encodedSize) {
      const size = encoder.encodedSize(tokens, options)
      const buf = new Bl(size)
      encoder(buf, tokens, options)
      /* c8 ignore next 4 */
      // this would be a problem with encodedSize() functions
      if (buf.chunks.length !== 1) {
        throw new Error(`Unexpected error: pre-calculated length for ${tokens} was wrong`)
      }
      return asU8A(buf.chunks[0])
    }
  }
  tokensToEncoded(buf, tokens, encoders, options)
  return buf.toBytes(true)
}

function encode (data, options) {
  options = Object.assign({}, defaultEncodeOptions, options)
  return encodeCustom(data, cborEncoders, options)
}

export { objectToTokens, encode, encodeCustom, Ref }
