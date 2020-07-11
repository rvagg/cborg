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
  return Array.prototype.map.call(buf, (e) => e.toString(16).padStart(2, '0')).join('')
}
