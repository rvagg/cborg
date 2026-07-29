/**
 * @param {Uint8Array} inp
 * @param {number} [width]
 */
declare function tokensToDiagnostic(inp: Uint8Array, width?: number): Generator<string, void, unknown>;
/**
 * Convert an input string formatted as CBOR diagnostic output into binary CBOR form.
 * @param {string} input
 * @returns {Uint8Array}
 */
declare function fromDiag(input: string): Uint8Array;
export { tokensToDiagnostic, fromDiag };
//# sourceMappingURL=diagnostic.d.ts.map