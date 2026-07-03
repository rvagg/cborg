export type EncodeOptions = import("../../interface.js").EncodeOptions;
export type ByteWriter = import("../../interface.js").ByteWriter;
export type AllocatedByteView = import("../../interface.js").AllocatedByteView;
export type Token = import("../token.js").Token;
/**
 * @param {any} data
 * @param {EncodeOptions} [options]
 * @returns {AllocatedByteView}
 */
export function encode(data: any, options?: EncodeOptions): AllocatedByteView;
//# sourceMappingURL=encode.d.ts.map