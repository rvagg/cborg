/**
 * @param {string} decodeErrPrefix
 * @return {DecodeFunction[]}
 */
export function jump(decodeErrPrefix: string): DecodeFunction[];
/**
 * @param {Token} token
 * @returns {Uint8Array|undefined}
 */
export function quickEncodeToken(token: Token): Uint8Array | undefined;
/** @type {Token[]} */
export const quick: Token[];
export type DecodeOptions = import("../interface.js").DecodeOptions;
export type DecodeFunction = import("../interface.js").DecodeFunction;
import { Token } from './token.js';
//# sourceMappingURL=jump.d.ts.map