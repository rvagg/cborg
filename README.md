# cborg - fast CBOR with a focus on strictness

[CBOR](https://cbor.io/) is "Concise Binary Object Representation", defined by [RFC 8949](https://tools.ietf.org/html/rfc8949). Like JSON, but binary, more compact, and supporting a much broader range of data types.

**cborg** focuses on strictness and deterministic data representations. CBORs flexibility leads to problems where determinism matters, such as in content-addressed data where your data encoding should converge on same-bytes for same-data. **cborg** helps aleviate these challenges.

**cborg** is also fast, and is suitable for the browser (is `Uint8Array` native) and Node.js.

**cborg** supports CBOR tags, but does not ship with them enabled by default. If you want tags, you need to plug them in to the encoder and decoder.

* [Example](#example)
* [CLI](#cli)
  * [`cborg bin2diag [binary input]`](#cborg-bin2diag-binary-input)
  * [`cborg bin2hex [binary string]`](#cborg-bin2hex-binary-string)
  * [`cborg bin2json [--pretty] [binary input]`](#cborg-bin2json---pretty-binary-input)
  * [`cborg diag2bin [diagnostic string]`](#cborg-diag2bin-diagnostic-string)
  * [`cborg diag2hex [diagnostic string]`](#cborg-diag2hex-diagnostic-string)
  * [`cborg diag2json [--pretty] [diagnostic string]`](#cborg-diag2json---pretty-diagnostic-string)
  * [`cborg hex2bin [hex string]`](#cborg-hex2bin-hex-string)
  * [`cborg hex2diag [hex string]`](#cborg-hex2diag-hex-string)
  * [`cborg hex2json [--pretty] [hex string]`](#cborg-hex2json---pretty-hex-string)
  * [`cborg json2bin [json string]`](#cborg-json2bin-json-string)
  * [`cborg json2diag [json string]`](#cborg-json2diag-json-string)
  * [`cborg json2hex '[json string]'`](#cborg-json2hex-json-string)
* [API](#api)
  * [`encode(object[, options])`](#encodeobject-options)
    * [Options](#options)
  * [`encodeInto(data, destination[, options])`](#encodeintodata-destination-options)
  * [`decode(data[, options])`](#decodedata-options)
    * [Options](#options-1)
  * [`decodeFirst(data[, options])`](#decodefirstdata-options)
  * [`encodedLength(data[, options])`](#encodedlengthdata-options)
  * [Type encoders](#type-encoders)
  * [Tag decoders](#tag-decoders)
* [Decoding with a custom tokeniser](#decoding-with-a-custom-tokeniser)
* [Deterministic encoding recommendations](#deterministic-encoding-recommendations)
  * [RFC 8949 deterministic mode](#rfc-8949-deterministic-mode)
  * [Round-trip consistency](#round-trip-consistency)
* [JSON mode](#json-mode)
  * [Example](#example-1)
* [Advanced types and tags](#advanced-types-and-tags)
* [Extended JavaScript types (`cborg/extended`)](#extended-javascript-types-cborgextended)
  * [When to use `cborg/extended`](#when-to-use-cborgextended)
  * [Supported types](#supported-types)
  * [Type fidelity: objects vs Maps](#type-fidelity-objects-vs-maps)
  * [Interoperability](#interoperability)
* [Selective type support (`cborg/taglib`)](#selective-type-support-cborgtaglib)
  * [`cborg/extended` vs `cborg/taglib`](#cborgextended-vs-cborgtaglib)
  * [Available exports](#available-exports)
* [License and Copyright](#license-and-copyright)

## Example

```js
import { encode, decode } from 'cborg'

const decoded = decode(Buffer.from('a16474686973a26269736543424f522163796179f5', 'hex'))
console.log('decoded:', decoded)
console.log('encoded:', encode(decoded))
```

```
decoded: { this: { is: 'CBOR!', yay: true } }
encoded: Uint8Array(21) [
  161, 100, 116, 104, 105, 115,
  162,  98, 105, 115, 101,  67,
   66,  79,  82,  33,  99, 121,
   97, 121, 245
]
```

## CLI

When installed globally via `npm` (with `npm install cborg --global`), the `cborg` command will be available that provides some handy CBOR CLI utilities. Run with `cborg help` for additional details.

The following commands take either input from the command line, or if no input is supplied will read from stdin. Output is printed to stdout. So you can `cat foo | cborg <command>`.

### `cborg bin2diag [binary input]`

Convert CBOR from binary input to a CBOR diagnostic output format which explains the byte contents.

```
$ cborg hex2bin 84616161620164f09f9880 | cborg bin2diag
84                                                # array(4)
  61                                              #   string(1)
    61                                            #     "a"
  61                                              #   string(1)
    62                                            #     "b"
  01                                              #   uint(1)
  64 f09f                                         #   string(2)
    f09f9880                                      #     "😀"
```

### `cborg bin2hex [binary string]`

A utility method to convert a binary input (stdin only) to hexadecimal output (does not involve CBOR).

### `cborg bin2json [--pretty] [binary input]`

Convert CBOR from binary input to JSON format.

```
$ cborg hex2bin 84616161620164f09f9880 | cborg bin2json
["a","b",1,"😀"]
```

### `cborg diag2bin [diagnostic string]`

Convert a CBOR diagnostic string to a binary data form of the CBOR.

```
$ cborg json2diag '["a","b",1,"😀"]' | cborg diag2bin | cborg bin2hex
84616161620164f09f9880
```

### `cborg diag2hex [diagnostic string]`

Convert a CBOR diagnostic string to the CBOR bytes in hexadecimal format.

```
$ cborg json2diag '["a","b",1,"😀"]' | cborg diag2hex
84616161620164f09f9880
```

### `cborg diag2json [--pretty] [diagnostic string]`

Convert a CBOR diagnostic string to JSON format.

```
$ cborg json2diag '["a","b",1,"😀"]' | cborg diag2json
["a","b",1,"😀"]
```

### `cborg hex2bin [hex string]`

A utility method to convert a hex string to binary output (does not involve CBOR).

### `cborg hex2diag [hex string]`

Convert CBOR from a hexadecimal string to a CBOR diagnostic output format which explains the byte contents.

```
$ cborg hex2diag 84616161620164f09f9880
84                                                # array(4)
  61                                              #   string(1)
    61                                            #     "a"
  61                                              #   string(1)
    62                                            #     "b"
  01                                              #   uint(1)
  64 f09f                                         #   string(2)
    f09f9880                                      #     "😀"
```

### `cborg hex2json [--pretty] [hex string]`

Convert CBOR from a hexadecimal string to JSON format.

```
$ cborg hex2json 84616161620164f09f9880
["a","b",1,"😀"]
$ cborg hex2json --pretty 84616161620164f09f9880
[
  "a",
  "b",
  1,
  "😀"
]
```

### `cborg json2bin [json string]`

Convert a JSON object into a binary data form of the CBOR.

```
$ cborg json2bin '["a","b",1,"😀"]' | cborg bin2hex
84616161620164f09f9880
```

### `cborg json2diag [json string]`

Convert a JSON object into a CBOR diagnostic output format which explains the contents of the CBOR form of the input object.

```
$ cborg json2diag '["a", "b", 1, "😀"]'
84                                                # array(4)
  61                                              #   string(1)
    61                                            #     "a"
  61                                              #   string(1)
    62                                            #     "b"
  01                                              #   uint(1)
  64 f09f                                         #   string(2)
    f09f9880                                      #     "😀"
```

### `cborg json2hex '[json string]'`

Convert a JSON object into CBOR bytes in hexadecimal format.

```
$ cborg json2hex '["a", "b", 1, "😀"]'
84616161620164f09f9880
```

## API

### `encode(object[, options])`

```js
import { encode } from 'cborg'
```

Encode a JavaScript object and return a `Uint8Array` with the CBOR byte representation.

* Objects containing circular references will be rejected.
* JavaScript objects that don't have standard CBOR type representations (without tags) may be rejected or encoded in surprising ways. If you need to encode a `Date` or a `RegExp` or another exotic type, you should either form them into intermediate forms before encoding or enable a tag encoder (see [Type encoders](#type-encoders)).
  * Natively supported types are: `null`, `undefined`, `number`, `bigint`, `string`, `boolean`, `Array`, `Object`, `Map`, `Buffer`, `ArrayBuffer`, `DataView`, `Uint8Array` and all other `TypedArray`s (the underlying byte array of TypedArrays is encoded, so they will all round-trip as a `Uint8Array` since the type information is lost).
* `Number`s will be encoded as integers if they don't have a fractional part (`1` and `1.0` are both considered integers, they are identical in JavaScript). Otherwise they will be encoded as floats.
* Integers will be encoded to their smallest possible representations: compacted (into the type byte), 8-bit, 16-bit, 32-bit or 64-bit.
* Integers larger than `Number.MAX_SAFE_INTEGER` or less than `Number.MIN_SAFE_INTEGER` will be encoded as floats. There is no way to safely determine whether a number has a fractional part outside of this range.
* `BigInt`s are supported by default within the 64-bit unsigned range but will be also be encoded to their smallest possible representation (so will not round-trip as a `BigInt` if they are smaller than `Number.MAX_SAFE_INTEGER`). Larger `BigInt`s require a tag (officially tags 2 and 3).
* Floats will be encoded in their smallest possible representations: 16-bit, 32-bit or 64-bit. Unless the `float64` option is supplied.
* Object properties are sorted according to the original [RFC 7049](https://tools.ietf.org/html/rfc7049) canonical representation recommended method: length-first and then bytewise. Note that this recommendation has changed in [RFC 8949](https://tools.ietf.org/html/rfc8949) to be plain bytewise, use the `rfc8949EncodeOptions` to apply this rule.
* The only CBOR major 7 "simple values" supported are `true`, `false`, `undefined` and `null`. "Simple values" outside of this range are intentionally not supported (pull requests welcome to enable them with an option).
* Objects, arrays, strings and bytes are encoded as fixed-length, encoding as indefinite length is intentionally not supported.

#### Options

* `float64` (boolean, default `false`): do not attempt to store floats as their smallest possible form, store all floats as 64-bit
* `typeEncoders` (object): a mapping of type name to function that can encode that type into cborg tokens. This may also be used to reject or transform types as objects are dissected for encoding. See the [Type encoders](#type-encoders) section below for more information.
* `mapSorter` (function): a function taking two arguments, where each argument is a `Token`, or an array of `Token`s representing the keys of a map being encoded. Similar to other JavaScript compare functions, a `-1`, `1` or `0` (which shouldn't be possible) should be returned depending on the sorting order of the keys. See the source code for the default sorting order which uses the length-first rule recommendation from [RFC 7049](https://tools.ietf.org/html/rfc7049).
* `ignoreUndefinedProperties` (boolean, default `false`): when encoding a plain object, properties with `undefined` values will be omitted. Does not apply to `Map`s or arrays.

### `encodeInto(data, destination[, options])`

```js
import { encodeInto } from 'cborg'
```

Encode a JavaScript object directly into a provided `Uint8Array` destination buffer, returning an object with a `written` property indicating the number of bytes written.

This API mirrors [`TextEncoder.encodeInto()`](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/encodeInto) and is useful for performance-critical scenarios where you want to avoid allocations by reusing a buffer.

```js
const destination = new Uint8Array(1024)
const { written } = encodeInto({ hello: 'world' }, destination)
const encoded = destination.subarray(0, written)
```

If the destination buffer is too small to hold the encoded data, an error will be thrown. Use `encodedLength()` to pre-calculate the required size if needed.

The same encoding rules and options as [`encode()`](#encodeobject-options) apply.

### `decode(data[, options])`

```js
import { decode } from 'cborg'
```

Decode valid CBOR bytes from a `Uint8Array` (or `Buffer`) and return a JavaScript object.

* Integers (major 0 and 1) that are outside of the safe integer range will be converted to a `BigInt`.
* The only CBOR major 7 "simple values" supported are `true`, `false`, `undefined` and `null`. "Simple values" outside of this range are intentionally not supported (pull requests welcome to enable them with an option).
* Indefinite length strings and byte arrays are intentionally not supported (pull requests welcome to enable them with an option). Although indefinite length arrays and maps are supported by default.

#### Options

* `allowIndefinite` (boolean, default `true`): when the indefinite length additional information (`31`) is encountered for any type (arrays, maps, strings, bytes) _or_ a "break" is encountered, an error will be thrown.
* `allowUndefined` (boolean, default `true`): when major 7, minor 23 (`undefined`) is encountered, an error will be thrown. To disallow `undefined` on encode, a custom [type encoder](#type-encoders) for `'undefined'` will need to be supplied.
* `coerceUndefinedToNull` (boolean, default `false`): when both `allowUndefined` and `coerceUndefinedToNull` are set to `true`, all `undefined` tokens (major `7` minor `23`: `0xf7`) will be coerced to `null` tokens, such that `undefined` is an allowed token but will not appear in decoded values.
* `allowInfinity` (boolean, default `true`): when an IEEE 754 `Infinity` or `-Infinity` value is encountered when decoding a major 7, an error will be thrown. To disallow `Infinity` and `-Infinity` on encode, a custom [type encoder](#type-encoders) for `'number'` will need to be supplied.
* `allowNaN` (boolean, default `true`): when an IEEE 754 `NaN` value is encountered when decoding a major 7, an error will be thrown. To disallow `NaN` on encode, a custom [type encoder](#type-encoders) for `'number'` will need to be supplied.
* `allowBigInt` (boolean, default `true`): when an integer outside of the safe integer range is encountered, an error will be thrown. To disallow `BigInt`s on encode, a custom [type encoder](#type-encoders) for `'bigint'` will need to be supplied.
* `strict` (boolean, default `false`): when decoding integers, including for lengths (arrays, maps, strings, bytes), values will be checked to see whether they were encoded in their smallest possible form. If not, an error will be thrown.
  * Currently, this form of deterministic strictness cannot be enforced for float representations, or map key ordering (pull requests _very_ welcome).
* `useMaps` (boolean, default `false`): when decoding major 5 (map) entries, use a `Map` rather than a plain `Object`. This will nest for any encountered map. During encode, a `Map` will be interpreted as an `Object` and will round-trip as such unless `useMaps` is supplied, in which case, all `Map`s and `Object`s will round-trip as `Map`s. There is no way to retain the distinction during round-trip without using a custom tag.
* `rejectDuplicateMapKeys` (boolean, default `false`): when the decoder encounters duplicate keys for the same map, an error will be thrown when this option is set. This is an additional _strictness_ option, disallowing data-hiding and reducing the number of same-data different-bytes possibilities where it matters.
* `retainStringBytes` (boolean, default `false`): when decoding strings, retain the original bytes on the `Token` object as `byteValue`. Since it is possible to encode non-UTF-8 characters in strings in CBOR, and JavaScript doesn't properly handle non-UTF-8 in its conversion from bytes (`TextEncoder` or `Buffer`), this can result in a loss of data (and an inability to round-trip). Where this is important, a token stream should be consumed instead of a plain `decode()` and the `byteValue` property on string tokens can be inspected (see [lib/diagnostic.js](lib/diagnostic.js) for an example of its use.)
* `tags` (array): a mapping of tag number to tag decoder function. By default no tags are supported. See [Tag decoders](#tag-decoders).
* `tokenizer` (object): an object with two methods, `next()` which returns a `Token`, `done()` which returns a `boolean` and `pos()` which returns the current byte position being decoded. Can be used to implement custom input decoding. See the source code for examples. (Note en-US spelling "tokenizer" used throughout exported methods and types, which may be confused with "tokeniser" used in these docs).

### `decodeFirst(data[, options])`

```js
import { decodeFirst } from 'cborg'
```

Decode valid CBOR bytes from a `Uint8Array` (or `Buffer`) and return a JavaScript object ***and*** the remainder of the original byte array that was not consumed by the decode. This can be useful for decoding concatenated CBOR objects, which is often used in streaming modes of CBOR.

The returned remainder `Uint8Array` is a subarray of the original input `Uint8Array` and will share the same underlying buffer. This means that there are no new allocations performed by this function and it is as efficient to use as `decode` but without the additional byte-consumption check.

The options for `decodeFirst` are the same as for [`decode()`](#decodedata-options), but the return type is different and `decodeFirst()` will not error if a decode operation doesn't consume all of the input bytes.

The return value is an array with two elements:

* `value`: the decoded JavaScript object
* `remainder`: a `Uint8Array` containing the bytes that were not consumed by the decode operation

```js
import { decodeFirst } from 'cborg'

let buf = Buffer.from('a16474686973a26269736543424f522163796179f564746869736269736543424f522163796179f5', 'hex')
while (buf.length) {
  const [value, remainder] = decodeFirst(buf)
  console.log('decoded:', value)
  buf = remainder
}
```

```
decoded: { this: { is: 'CBOR!', yay: true } }
decoded: this
decoded: is
decoded: CBOR!
decoded: yay
decoded: true
```

### `encodedLength(data[, options])`

```js
import { encodedLength } from 'cborg/length'
```

Calculate the byte length of the given data when encoded as CBOR with the options provided. The options are the same as for an `encode()` call. This calculation will be accurate if the same options are used as when performing a normal `encode()`. Some encode options can change the encoding output length.

A `tokensToLength()` function is available which deals directly with a tokenized form of the object, but this only recommended for advanced users.

### Type encoders

The `typeEncoders` property to the `options` argument to `encode()` allows you to add additional functionality to cborg, or override existing functionality.

When converting JavaScript objects, types are differentiated using the method and naming used by [@sindresorhus/is](https://github.com/sindresorhus/is) _(a custom implementation is used internally for performance reasons)_ and an internal set of type encoders are used to convert objects to their appropriate CBOR form. Supported types are: `null`, `undefined`, `number`, `bigint`, `string`, `boolean`, `Array`, `Object`, `Map`, `Buffer`, `ArrayBuffer`, `DataView`, `Uint8Array` and all other `TypedArray`s (their underlying byte array is encoded, so they will all round-trip as a `Uint8Array` since the type information is lost). Any object that doesn't match a type in this list will cause an error to be thrown during decode. e.g. `encode(new Date())` will throw an error because there is no internal `Date` type encoder.

The `typeEncoders` option is an object whose property names match to @sindresorhus/is type names. When this option is provided and a property exists for any given object's type, the function provided as the value to that property is called with the object as an argument.

If a type encoder function returns `null`, the default encoder, if any, is used instead.

If a type encoder function returns an array, cborg will expect it to contain zero or more `Token` objects that will be encoded to binary form.

`Token`s map directly to CBOR entities. Each one has a `Type` and a `value`. A type encoder is responsible for turning a JavaScript object into a set of tags.

This example is available from the cborg taglib as `bigIntEncoder` (`import { bigIntEncoder } as taglib from 'cborg/taglib'`) and implements CBOR tags 2 and 3 (bigint and negative bigint). This function would be registered using an options parameter `{ typeEncoders: { bigint: bigIntEncoder } }`. All objects that have a type `bigint` will pass through this function.

```js
import { Token, Type } from './cborg.js'

function bigIntEncoder (obj) {
  // check whether this BigInt could fit within a standard CBOR 64-bit int or less
  if (obj >= -1n * (2n ** 64n) && obj <= (2n ** 64n) - 1n) {
    return null // handle this as a standard int or negint
  }
  // it's larger than a 64-bit int, encode as tag 2 (positive) or 3 (negative)
  return [
    new Token(Type.tag, obj >= 0n ? 2 : 3),
    new Token(Type.bytes, fromBigInt(obj >= 0n ? obj : obj * -1n - 1n))
  ]
}

function fromBigInt (i) { /* returns a Uint8Array, omitted from example */ }
```

This example encoder demonstrates the ability to pass-through to the default encoder, or convert to a series of custom tags. In this case we can put any arbitrarily large `BigInt` into a byte array using the standard CBOR tag 2 and 3 types.

Valid `Token` types for the second argument to `Token()` are:

```js
Type.uint
Type.negint
Type.bytes
Type.string
Type.array
Type.map
Type.tag
Type.float
Type.false
Type.true
Type.null
Type.undefined
Type.break
```

Using type encoders we can:
 * Override the default encoder entirely (always return an array of `Token`s)
 * Override the default encoder for a subset of values (use `null` as a pass-through)
 * Omit an object type entirely from the encode (return an empty array)
 * Convert an object to something else entirely (such as a tag, or make all `number`s into floats)
 * Throw if something should that is supported should be unsupported (e.g. `undefined`)

### Tag decoders

By default cborg does not support decoding of any tags. Where a tag is encountered during decode, an error will be thrown. If tag support is needed, they will need to be supplied as options to the `decode()` function. The `tags` property should contain an object mapping tag numbers to decoder functions.

Tag decoder functions receive a `decode` control object with two methods:
- `decode()`: decode the tagged content and return it
- `decode.entries()`: for map content, returns `[[key, value], ...]` preserving key types

This example is available from the cborg taglib as `bigIntDecoder` and `bigNegIntDecoder` (`import { bigIntDecoder, bigNegIntDecoder } from 'cborg/taglib'`) and implements CBOR tags 2 and 3 (bigint and negative bigint). This function would be registered using an options parameter:

```js
const tags = {
  2: bigIntDecoder,
  3: bigNegIntDecoder
}

decode(bytes, { tags })
```

Implementation:

```js
function bigIntDecoder (decode) {
  const bytes = decode()  // get the tagged byte content
  let bi = 0n
  for (let ii = 0; ii < bytes.length; ii++) {
    bi = (bi << 8n) + BigInt(bytes[ii])
  }
  return bi
}

function bigNegIntDecoder (decode) {
  const bytes = decode()
  let bi = 0n
  for (let ii = 0; ii < bytes.length; ii++) {
    bi = (bi << 8n) + BigInt(bytes[ii])
  }
  return -1n - bi
}
```

For tags that wrap CBOR maps and need to preserve non-string key types, use `decode.entries()`:

```js
// Tag 259: Map with any key type
function mapDecoder (decode) {
  return new Map(decode.entries())
}
```

## Decoding with a custom tokeniser

`decode()` allows overriding the `tokenizer` option to provide a custom tokeniser. This object can be described with the following interface:

```typescript
export interface DecodeTokenizer {
  next(): Token,
  done(): boolean,
  pos(): number,
}
```

`next()` should return the next token in the stream, `done()` should return `true` when the stream is finished, and `pos()` should return the current byte position in the stream.

Overriding the default tokeniser can be useful for changing the rules of decode. For example, it is used to turn cborg into a JSON decoder by changing parsing rules on how to turn bytes into tokens. See the source code for how this works.

The default `Tokenizer` class is available from the default export. Providing `options.tokenizer = new Tokenizer(bytes, options)` would result in the same decode path using this tokeniser. However, this can also be used to override or modify default decode paths by intercepting the token stream. For example, to perform a decode that disallows bytes, the following code would work:

```js
import { decode, Tokenizer, Type } from 'cborg'

class CustomTokeniser extends Tokenizer {
  next () {
    const nextToken = super.next()
    if (Type.equals(nextToken.type, Type.bytes)) {
      throw new Error('Unsupported type: bytes')
    }
    return nextToken
  }
}

function customDecode (data, options) {
  options = Object.assign({}, options, {
    tokenizer: new CustomTokeniser(data, options)
  })
  return decode(data, options)
}
```

## Deterministic encoding recommendations

cborg is designed with deterministic encoding forms as a primary feature. It is suitable for use with content addressed systems or other systems where convergence of binary forms is important. The ideal is to have strictly _one way_ of mapping a set of data into a binary form. Unfortunately CBOR has many opportunities for flexibility, including:

* Varying number sizes and no strict requirement for their encoding - e.g. a `1` may be encoded as `0x01`, `0x1801`, `0x190001`, `1a00000001` or `1b0000000000000001`.
* Varying int sizes used as lengths for lengthed objects (maps, arrays, strings, bytes) - e.g. a single entry array could specify its length using any of the above forms for `1`. Tags can also vary in size and still represent the same number.
* IEEE 754 allows for `NaN`, `Infinity` and `-Infinity` to be represented in many different ways, meaning it is possible to represent the same data using many different byte forms.
* Indefinite length items where the length is omitted from the additional item of the entity token and a "break" is inserted to indicate the end of of the object. This provides two ways to encode the same object.
* Tags that can allow alternative representations of objects - e.g. using the bigint or negative bigint tags to represent standard size integers.
* Map ordering is flexible by default, so a single map can be represented in many different forms by shuffling the keys.
* Many CBOR decoders ignore trailing bytes that are not part of an initial object. This can be helpful to support streaming-CBOR, but opens avenues for byte padding.

By default, cborg will always **encode** objects to the same bytes by applying some strictness rules:

* Using smallest-possible representations for ints, negative ints, floats and lengthed object lengths.
* Always sorting maps using the _original_ recommended [RFC 7049](https://tools.ietf.org/html/rfc7049) map key ordering rules. (Note that this has changed in [RFC 8949](https://tools.ietf.org/html/rfc8949) to be plain bytewise sorting, use the `rfc8949EncodeOptions` to apply this rule).
* Omitting support for tags (therefore omitting support for exotic object types).
* Applying deterministic rules to `number` differentiation - if a fractional part is missing and it's within the safe integer boundary, it's encoded as an integer, otherwise it's encoded as a float.

By default, cborg allows for some flexibility on **decode** of objects, which will present some challenges if users wish to impose strictness requirements at both serialisation _and_ deserialisation. Options that can be provided to `decode()` to impose some strictness requirements are:

* `strict: true` to impose strict sizing rules for int, negative ints and lengths of lengthed objects
* `allowNaN: false` and `allowInfinity` to prevent decoding of any value that would resolve to `NaN`, `Infinity` or `-Infinity`, using CBOR tokens or IEEE 754 representation—as long as your application can do without these symbols.
* `allowIndefinite: false` to disallow indefinite lengthed objects and the "break" tag
* Not providing any tag decoders, or ensuring that tag decoders are strict about their forms (e.g. a bigint decoder could reject bigints that could have fit into a standard major 0 64-bit integer).
* Overriding type decoders where they may introduce undesired flexibility.

### RFC 8949 deterministic mode

RFC 8949 updates the canonical map ordering recommendation to plain bytewise comparisons. The `rfc8949EncodeOptions` export configures cborg to follow this rule and can be passed directly to `encode`:

```js
import { encode, rfc8949EncodeOptions } from 'cborg'

const bytes = encode(obj, rfc8949EncodeOptions)
```

You can also merge these defaults with your own preferences:

```js
import { encode, rfc8949EncodeOptions } from 'cborg'

const bytes = encode(obj, { ...rfc8949EncodeOptions, typeEncoders: YOUR_TYPE_ENCODERS })
```

Currently, there are two areas that cborg cannot impose strictness requirements (pull requests welcome!):

* Smallest-possible floats, or always-float64 cannot be enforced on decode.
* Map ordering cannot be enforced on decode.

### Round-trip consistency

There are a number of forms where an object will not round-trip precisely, if this matters for an application, care should be taken, or certain types should be disallowed entirely during encode.

* All `TypedArray`s will decode as `Uint8Array`s, unless a custom tag is used.
* Both `Map` and `Object` will be encoded as a CBOR `map`, as will any other object that inherits from `Object` that can't be differentiated by the [@sindresorhus/is](https://github.com/sindresorhus/is) algorithm. They will all decode as `Object` by default, or `Map` if `useMaps` is set to `true`. e.g. `{ foo: new Map() }` will round-trip to `{ foo: {} }` by default.

## JSON mode

**cborg** can also encode and decode JSON using the same pipeline and many of the same settings. For most (but not all) cases it will be faster to use `JSON.parse()` and `JSON.stringify()`, however **cborg** provides much more control over the process to handle determinism and be more restrictive in allowable forms. It also operates natively with Uint8Arrays rather than strings which may also offer some minor efficiency or usability gains in some circumstances.

Use `import { encode, decode, decodeFirst } from 'cborg/json'` to access the JSON handling encoder and decoder.

Many of the same encode and decode options available for CBOR can be used to manage JSON handling. These include strictness requirements for decode and custom tag encoders for encode. Tag encoders can't create new tags as there are no tags in JSON, but they can replace JavaScript object forms with custom JSON forms (e.g. convert a `Uint8Array` to a valid JSON form rather than having the encoder throw an error). The inverse is also possible, turning specific JSON forms into JavaScript forms, by using a custom tokeniser on decode.

Special notes on options specific to the JSON:

* Decoder `allowBigInt` option: is repurposed for the JSON decoder and defaults to `false`. When `false`, all numbers are decoded as `Number`, possibly losing precision when encountering numbers outside of the JavaScript safe integer range. When `true` numbers that have a decimal point (`.`, even if just `.0`) are returned as a `Number`, but for numbers without a decimal point _and_ that are outside of the JavaScript safe integer range, they are returned as `BigInt`s. This behaviour differs from CBOR decoding which will error when decoding integer and negative integer tokens that are outside of the JavaScript safe integer range if `allowBigInt` is `false`.

See **[@ipld/dag-json](https://github.com/ipld/js-dag-json)** for an advanced use of the **cborg** JSON encoder and decoder including round-tripping of `Uint8Array`s and custom JavaScript classes (IPLD `CID` objects in this case).

### Example

Similar to the [CBOR example above](#example), using JSON:

```js
import { encode, decode } from 'cborg/json'

const decoded = decode(Buffer.from('7b2274686973223a7b226973223a224a534f4e21222c22796179223a747275657d7d', 'hex'))
console.log('decoded:', decoded)
console.log('encoded:', encode(decoded))
console.log('encoded (string):', Buffer.from(encode(decoded)).toString())
```

```
decoded: { this: { is: 'JSON!', yay: true } }
encoded: Uint8Array(34) [
  123,  34, 116, 104, 105, 115,  34,  58,
  123,  34, 105, 115,  34,  58,  34,  74,
   83,  79,  78,  33,  34,  44,  34, 121,
   97, 121,  34,  58, 116, 114, 117, 101,
  125, 125
]
encoded (string): {"this":{"is":"JSON!","yay":true}}
```

## Advanced types and tags

As demonstrated above, the ability to provide custom `typeEncoders` to `encode()`, `tags` and even a custom `tokenizer` to `decode()` allow for quite a bit of flexibility in manipulating both the encode and decode process. An advanced example that uses all of these features can be found in [example-bytestrings.js](./example-bytestrings.js) which demonstrates how one might implement [RFC 8746](https://www.rfc-editor.org/rfc/rfc8746.html) to allow typed arrays to round-trip through CBOR and retain their original types. Since cborg is designed to speak purely in terms of `Uint8Array`s, its default behaviour will squash all typed arrays down to their byte array forms and materialise them as plain `Uint8Arrays`. Where round-trip fidelity is important and CBOR tags are an option, this form of usage is an option.

## Extended JavaScript types (`cborg/extended`)

Need to serialise `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `Error`, or `TypedArray`? The `cborg/extended` module provides encode/decode with built-in support for native JavaScript types that JSON can't handle.

The type support is similar to the browser's **[structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)**, the built-in deep-copy mechanism that handles these same types. `cborg/extended` provides similar type fidelity in a compact binary serialisation format.

See [example-extended.js](./example-extended.js) for a runnable demo.

```js
import { encode, decode } from 'cborg/extended'

const data = {
  date: new Date(),
  pattern: /foo.*bar/gi,
  mapping: new Map([['key', 'value'], [42, 'number key']]),
  collection: new Set([1, 2, 3]),
  binary: new Uint16Array([1, 2, 3]),
  bignum: 12345678901234567890n,
  error: new TypeError('something went wrong')
}

const encoded = encode(data)
const decoded = decode(encoded)

// All types are preserved
decoded.date instanceof Date           // true
decoded.pattern instanceof RegExp      // true
decoded.mapping instanceof Map         // true
decoded.collection instanceof Set      // true
decoded.binary instanceof Uint16Array  // true
typeof decoded.bignum === 'bigint'     // true
decoded.error instanceof TypeError     // true
```

### When to use `cborg/extended`

Use `cborg/extended` instead of base `cborg` or JSON when you need:

- **Date serialisation**: JSON requires manual `toISOString()`/`new Date()` conversion
- **BigInt support**: JSON throws on BigInt; base cborg only preserves BigInts outside 64-bit range
- **Map with non-string keys**: `new Map([[1, 'one'], [{}, 'object key']])` just works
- **Set preservation**: Sets round-trip as Sets, not Arrays
- **TypedArray types**: `Float32Array` stays `Float32Array`, not `Uint8Array`
- **Error serialisation**: `Error`, `TypeError`, `RangeError`, etc. preserve type and message
- **Negative zero**: `-0` round-trips correctly (base cborg encodes as `0`)
- **Insertion order**: Map and object key order is preserved (not sorted)
- **Binary efficiency**: ~30-50% smaller than JSON for typical data

### Supported types

| Type | CBOR Tag | Notes |
|------|----------|-------|
| `Date` | 1 | Epoch seconds as float (millisecond precision) |
| `RegExp` | 21066 | Pattern and flags preserved |
| `Set` | 258 | IANA registered finite set |
| `Map` | 259 | Supports any key type |
| `BigInt` | 2, 3 | Always tagged for round-trip fidelity |
| `Error` | 27 | All standard error types (`TypeError`, `RangeError`, etc.) |
| `-0` | *(float)* | Negative zero encoded as half-precision float |
| `Uint8Array` | 64 | RFC 8746 |
| `Uint8ClampedArray` | 68 | RFC 8746 |
| `Int8Array` | 72 | RFC 8746 |
| `Uint16Array` | 69 | RFC 8746 (little-endian) |
| `Int16Array` | 77 | RFC 8746 (little-endian) |
| `Uint32Array` | 70 | RFC 8746 (little-endian) |
| `Int32Array` | 78 | RFC 8746 (little-endian) |
| `Float32Array` | 85 | RFC 8746 (little-endian) |
| `Float64Array` | 86 | RFC 8746 (little-endian) |
| `BigUint64Array` | 71 | RFC 8746 (little-endian) |
| `BigInt64Array` | 79 | RFC 8746 (little-endian) |

### Type fidelity: objects vs Maps

`cborg/extended` preserves the distinction between plain objects and `Map` instances:

```js
// Plain objects round-trip as plain objects
const obj = { name: 'Alice', age: 30 }
decode(encode(obj))  // { name: 'Alice', age: 30 }

// Maps round-trip as Maps (including non-string keys)
const map = new Map([[1, 'one'], ['two', 2]])
decode(encode(map))  // Map { 1 => 'one', 'two' => 2 }

// Mixed structures work correctly
const data = {
  users: new Map([['alice', { role: 'admin' }]])
}
const decoded = decode(encode(data))
decoded.users instanceof Map  // true
decoded.users.get('alice')    // { role: 'admin' } (plain object)
```

This works because `Map` instances are encoded with CBOR Tag 259, while plain objects use untagged CBOR maps. The decoder uses `decode.entries()` internally to preserve key types for tagged maps.

### Interoperability and limitations

The tags used by `cborg/extended` are standard CBOR tags registered with IANA:

- Tags 1, 2, 3 (Date, BigInt): RFC 8949
- Tag 27 (Error): IANA "object with class name and constructor arguments"
- Tags 64-87 (TypedArrays): RFC 8746
- Tags 258, 259 (Set, Map): IANA registry
- Tag 21066 (RegExp): IANA registry

**Important considerations:**

- **Parser support varies**: CBOR parsers that don't recognise these tags will either error or return raw tagged values. Many minimal CBOR implementations only handle core types. Test interoperability with your specific target platforms.

- **Not for content addressing**: `cborg/extended` prioritises JavaScript type fidelity over deterministic encoding. Map and object keys preserve insertion order (not sorted), floating-point dates lose sub-millisecond precision, and Set iteration order depends on insertion. The same data structure built differently may encode to different bytes. For content-addressed systems (IPLD, CIDs), use base `cborg` with `@ipld/dag-cbor` conventions instead.

- **Implementation differences**: Even among parsers that support these tags, behaviour may differ. For example, Date precision (seconds vs milliseconds), RegExp flag handling, or TypedArray endianness assumptions. The CBOR specs allow flexibility that can cause subtle incompatibilities.

- **JavaScript-centric**: Types like `RegExp` and JavaScript's specific TypedArray variants don't have equivalents in many languages. Data encoded with `cborg/extended` is best suited for JavaScript-to-JavaScript communication.

## Selective type support (`cborg/taglib`)

If you don't need all extended types, `cborg/taglib` exports individual encoders and decoders. Use this when you want to enable specific types without the full `cborg/extended` configuration, or when you need to customise behaviour.

> **Tip:** See [lib/extended/extended.js](./lib/extended/extended.js) for how `cborg/extended` assembles the taglib components, use it as a template for your own configuration.

```js
import { encode, decode } from 'cborg'
import {
  dateEncoder,
  dateDecoder,
  bigIntEncoder,
  bigIntDecoder,
  bigNegIntDecoder,
  TAG_DATE_EPOCH
} from 'cborg/taglib'

// Enable just Date and BigInt support
const encoded = encode(data, {
  typeEncoders: {
    Date: dateEncoder,
    bigint: bigIntEncoder
  }
})

const decoded = decode(encoded, {
  tags: {
    [TAG_DATE_EPOCH]: dateDecoder,
    2: bigIntDecoder,
    3: bigNegIntDecoder
  }
})
```

### `cborg/extended` vs `cborg/taglib`

| Use case | Module |
|----------|--------|
| Serialize all JS types, minimal config | `cborg/extended` |
| Only need Date and BigInt | `cborg/taglib` with selective imports |
| Custom encode/decode logic | `cborg/taglib` as building blocks |
| Interop with IPLD/content-addressed systems | `cborg/taglib` with `bigIntEncoder` (not `structBigIntEncoder`) |

### Available exports

**Encoders:**
- `dateEncoder`: Date as epoch float (Tag 1)
- `regExpEncoder`: RegExp as [pattern, flags] (Tag 21066)
- `setEncoder`: Set as tagged array (Tag 258)
- `mapEncoder`: Map as tagged CBOR map (Tag 259)
- `bigIntEncoder`: BigInt, only tags values outside 64-bit range (IPLD compatible)
- `structBigIntEncoder`: BigInt, always tags (full round-trip as bigint)
- TypedArray encoders: `uint8ArrayEncoder`, `uint8ClampedArrayEncoder`, `int8ArrayEncoder`, `uint16ArrayEncoder`, `int16ArrayEncoder`, `uint32ArrayEncoder`, `int32ArrayEncoder`, `float32ArrayEncoder`, `float64ArrayEncoder`, `bigUint64ArrayEncoder`, `bigInt64ArrayEncoder`

**Decoders:**
- `dateDecoder`, `regExpDecoder`, `setDecoder`, `mapDecoder`
- `bigIntDecoder` (Tag 2), `bigNegIntDecoder` (Tag 3)
- TypedArray decoders: `uint8ArrayDecoder`, `uint8ClampedArrayDecoder`, `int8ArrayDecoder`, `uint16ArrayDecoder`, `int16ArrayDecoder`, `uint32ArrayDecoder`, `int32ArrayDecoder`, `float32ArrayDecoder`, `float64ArrayDecoder`, `bigUint64ArrayDecoder`, `bigInt64ArrayDecoder`

**Tag constants:** `TAG_DATE_STRING`, `TAG_DATE_EPOCH`, `TAG_BIGINT_POS`, `TAG_BIGINT_NEG`, `TAG_UINT8_ARRAY`, `TAG_UINT8_CLAMPED_ARRAY`, `TAG_INT8_ARRAY`, `TAG_UINT16_ARRAY_LE`, `TAG_INT16_ARRAY_LE`, `TAG_UINT32_ARRAY_LE`, `TAG_INT32_ARRAY_LE`, `TAG_FLOAT32_ARRAY_LE`, `TAG_FLOAT64_ARRAY_LE`, `TAG_BIGUINT64_ARRAY_LE`, `TAG_BIGINT64_ARRAY_LE`, `TAG_SET`, `TAG_MAP`, `TAG_REGEXP`

## License and Copyright

Copyright 2020 Rod Vagg

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
