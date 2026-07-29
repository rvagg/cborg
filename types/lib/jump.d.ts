import { Token } from './token.js';
export type DecodeOptions = import('../interface.js').DecodeOptions;
export type AllocatedByteView = import('../interface.js').AllocatedByteView;
/** @type {((data:Uint8Array, pos:number, minor:number, options?:DecodeOptions) => any)[]} */
export declare const jump: ((data: Uint8Array, pos: number, minor: number, options?: DecodeOptions) => any)[];
/** @type {Token[]} */
export declare const quick: Token[];
/**
 * @param {Token} token
 * @returns {AllocatedByteView|undefined}
 */
export declare function quickEncodeToken(token: Token): AllocatedByteView | undefined;
//# sourceMappingURL=jump.d.ts.map