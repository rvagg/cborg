export type Annotation = {
    /**
     * why the content is not interpreted
     */
    note?: string;
    /**
     * labelled byte ranges of the content
     */
    parts?: {
        start: number;
        end: number;
        label: string;
    }[];
    /**
     * the content decoded as CBOR
     */
    embedded?: Diagnosis;
    /**
     * the content's value as the tag reads it
     */
    summary?: string;
};
export type DiagnosticNode = {
    /**
     * token type name, as `Type.name`
     */
    type: string;
    /**
     * offset of the initial byte
     */
    start: number;
    /**
     * offset after the argument bytes; a string's content runs from here to `end`
     */
    headerEnd: number;
    /**
     * offset after the item, including its children and break
     */
    end: number;
    /**
     * containers and tags the item sits in; a break sits at its opener's depth
     */
    depth: number;
    /**
     * the token value: a length for arrays and maps (`Infinity` if indefinite), the number for tags
     */
    value: any;
    /**
     * a text string whose bytes are not valid UTF-8
     */
    invalidUtf8?: boolean;
    /**
     * a tag's name, where known
     */
    tagName?: string;
    /**
     * array elements, alternating map keys and values, or a tag's content, then any break
     */
    children?: DiagnosticNode[];
    /**
     * set on a tag's content
     */
    annotation?: Annotation;
};
export type Diagnosis = {
    bytes: Uint8Array;
    items: DiagnosticNode[];
    /**
     * what stopped decoding; `items` holds what was read before it
     */
    error?: {
        offset: number;
        cause: Error;
    };
};
export type Interpreter = (content: DiagnosticNode, bytes: Uint8Array, level: number) => Annotation | undefined;
/**
 * Describe CBOR as a tree of items with their byte ranges and tag
 * interpretations. Reads a sequence of items. Decoding stops at the first
 * error, which is returned with the items read before it.
 *
 * @param {Uint8Array} bytes
 * @returns {Diagnosis}
 */
declare function diagnose(bytes: Uint8Array): Diagnosis;
export { diagnose };
//# sourceMappingURL=diagnose.d.ts.map