/**
 * @param {Uint8Array} data
 * @param {number} pos
 * @param {number} need
 * @param {string} decodeErrPrefix
 */
export function assertEnoughData (data, pos, need, decodeErrPrefix) {
  if (data.length - pos < need) {
    throw new Error(`${decodeErrPrefix} not enough data for type`)
  }
}
