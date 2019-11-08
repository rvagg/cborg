module.exports.hexToUint8Array = function hexToUint8Array (hex) {
  return new Uint8Array(hex.split('')
    .map((c, i, d) => i % 2 === 0 ? `0x${c}${d[i + 1]}` : '')
    .filter(Boolean)
    .map((e) => parseInt(e, 16)))
}

module.exports.uint8ArrayToHex = function uint8ArrayToHex (buf) {
  return Array.prototype.map.call(buf, (e) => e.toString(16).padStart(2, '0')).join('')
}
