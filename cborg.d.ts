export type TagDecoder = (inner: any) => any
export type TypeEncoder = (data: any) => Token[] | null

export interface DecodeOptions {
    allowIndefinite?: boolean
    allowUndefined?: boolean
    allowInfinity?: boolean
    allowNaN?: boolean
    allowBigInt?: boolean
    strict?: boolean
    useMaps?: boolean
    tags?: TagDecoder[]
}

export interface EncodeOptions {
    float64?: boolean
    typeEncoders?: { [typeName: string]: TypeEncoder }
}

export function decode (data: Uint8Array, options?: DecodeOptions): any
export function encode (data: any, options?: EncodeOptions): Uint8Array

export class Token {
    type: Type
    value: any
    encodedLength: number
}

export class Type {
    major: number
    majorEncoded: number
    name: string
    terminal: boolean
}
