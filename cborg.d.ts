export type TypeEncoder = (data: any, typ?:string, options?:EncodeOptions, refStack?:Ref) => Token | Token[] | null

export interface EncodeOptions {
    float64?: boolean
    typeEncoders?: { [typeName: string]: TypeEncoder }
}

export function decode (data: Uint8Array, options?: DecodeOptions): any
export function encode (data: any, options?: EncodeOptions): Uint8Array

export class Token {
    constructor (type: Type, value: any, encodedLength?: number)
    type: Type
    value: any
    encodedLength: number
}

export class Type {
    major: number
    majorEncoded: number
    name: string
    terminal: boolean
    static uint: Type
    static negint: Type
    static bytes: Type
    static string: Type
    static array: Type
    static map: Type
    static tag: Type
    static float: Type
    static false: Type
    static true: Type
    static null: Type
    static undefined: Type
    static break: Type
}
