export function hexToUint8Array (hex) {
  if (hex instanceof Uint8Array) {
    return hex
  }
  return new Uint8Array(hex.split('')
    .map((c, i, d) => i % 2 === 0 ? `0x${c}${d[i + 1]}` : '')
    .filter(Boolean)
    .map((e) => parseInt(e, 16)))
}

export function uint8ArrayToHex (buf) {
  if (typeof buf === 'string') {
    return buf
  }
  return Array.prototype.reduce.call(buf, (p, c) => `${p}${c.toString(16).padStart(2, '0')}`, '')
}
