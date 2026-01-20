// This is an unfortunate replacement for @sindresorhus/is that we need to
// re-implement for performance purposes. In particular the is.observable()
// check is expensive, and unnecessary for our purposes. The values returned
// are compatible with @sindresorhus/is, however.

// Types that reach getObjectType() - excludes types with fast-paths above:
// primitives (typeof), Array (isArray), Uint8Array (instanceof), plain Object (constructor)
const objectTypeNames = [
  'Object', // for Object.create(null) and other non-plain objects
  'RegExp',
  'Date',
  'Error',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'ArrayBuffer',
  'SharedArrayBuffer',
  'DataView',
  'Promise',
  'URL',
  'HTMLElement',
  'Int8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array'
]

/**
 * @param {any} value
 * @returns {string}
 */
export function is (value) {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'undefined'
  }
  if (value === true || value === false) {
    return 'boolean'
  }
  const typeOf = typeof value
  if (typeOf === 'string' || typeOf === 'number' || typeOf === 'bigint' || typeOf === 'symbol') {
    return typeOf
  }
  /* c8 ignore next 3 */
  if (typeOf === 'function') {
    return 'Function'
  }
  if (Array.isArray(value)) {
    return 'Array'
  }
  // Also catches Node.js Buffer which extends Uint8Array
  if (value instanceof Uint8Array) {
    return 'Uint8Array'
  }
  // Fast path for plain objects (most common case after primitives/arrays/bytes)
  if (value.constructor === Object) {
    return 'Object'
  }
  const objectType = getObjectType(value)
  if (objectType) {
    return objectType
  }
  /* c8 ignore next */
  return 'Object'
}

/**
 * @param {any} value
 * @returns {string|undefined}
 */
function getObjectType (value) {
  const objectTypeName = Object.prototype.toString.call(value).slice(8, -1)
  if (objectTypeNames.includes(objectTypeName)) {
    return objectTypeName
  }
  /* c8 ignore next */
  return undefined
}
