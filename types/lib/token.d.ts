declare class Type {
    major: number;
    majorEncoded: number;
    name: string;
    terminal: boolean;
    /**
     * @param {number} major
     * @param {string} name
     * @param {boolean} terminal
     */
    constructor(major: number, name: string, terminal: boolean);
    toString(): string;
    /**
     * @param {Type} typ
     * @returns {number}
     */
    compare(typ: Type): number;
    /**
     * Check equality between two Type instances. Safe to use across different
     * copies of the Type class (e.g., when bundlers duplicate the module).
     * (major, name) uniquely identifies a Type; terminal is implied by these.
     * @param {Type} a
     * @param {Type} b
     * @returns {boolean}
     */
    static equals(a: Type, b: Type): boolean;
}
declare namespace Type {
    export var uint: Type;
    export var negint: Type;
    export var bytes: Type;
    export var string: Type;
    export var array: Type;
    export var map: Type;
    export var tag: Type;
    export var float: Type;
    var _a: Type;
    export { _a as false };
    export var _b: Type;
    export { _b as true };
    export var _c: Type;
    export { _c as null };
    export var _d: Type;
    export { _d as undefined };
    export var _e: Type;
    export { _e as break };
}
declare class Token {
    type: Type;
    value: any;
    encodedLength: number | undefined;
    /** @type {Uint8Array|undefined} */
    encodedBytes: Uint8Array | undefined;
    /** @type {Uint8Array|undefined} */
    byteValue: Uint8Array | undefined;
    /**
     * @param {Type} type
     * @param {any} [value]
     * @param {number} [encodedLength]
     */
    constructor(type: Type, value?: any, encodedLength?: number);
    toString(): string;
}
export { Type, Token };
//# sourceMappingURL=token.d.ts.map