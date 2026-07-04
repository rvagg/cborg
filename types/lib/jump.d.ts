/**
 * @param {Token} token
 * @returns {AllocatedByteView|undefined}
 */
export function quickEncodeToken(token: Token): AllocatedByteView | undefined;
/** @type {((data:Uint8Array, pos:number, minor:number, options?:DecodeOptions) => any)[]} */
export const jump: ((data: Uint8Array, pos: number, minor: number, options?: DecodeOptions) => any)[];
/** @type {Token[]} */
export const quick: Token[];
export type DecodeOptions = import("../interface.js").DecodeOptions;
export type AllocatedByteView = import("../interface.js").AllocatedByteView;
import { Token } from './token.js';
//# sourceMappingURL=jump.d.ts.map