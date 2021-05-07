import { Token, Type } from './token'

export type TokenOrNestedTokens = Token | Token[] | TokenOrNestedTokens[]

export interface Reference {
  parent: Reference | undefined
  obj: object | any[]
  includes (obj: object | any[]): boolean
}

export type OptionalTypeEncoder = (data: any, typ:string, options:Record<string, any>, refStack?:Reference) => TokenOrNestedTokens

export type StrictTypeEncoder = (data: any, typ:string, options:Record<string, any>, refStack?:Reference) => TokenOrNestedTokens

export type TokenTypeEncoder = {
  (buf:Bl, token:Token, options?:Record<string, any>);
  compareTokens (t1:Token, t2:Token):number;
  encodedSize? (token:Token, options?:Record<string, any>);
}

export type MapSorter = (e1: (Token | Token[])[], e2: (Token | Token[])[]) => number

export type QuickEncodeToken = (token: Token) => Uint8Array | undefined

export interface DecodeTokenizer {
  done (): boolean,
  next (): Token
}

export type TagDecoder = (inner: any) => any

export interface DecodeOptions {
    allowIndefinite?: boolean
    allowUndefined?: boolean
    allowInfinity?: boolean
    allowNaN?: boolean
    allowBigInt?: boolean
    strict?: boolean
    useMaps?: boolean
    tags?: TagDecoder[],
    tokenizer?: DecodeTokenizer
}

export interface EncodeOptions {
  float64?: boolean,
  addBreakTokens?: boolean,
  mapSorter?: MapSorter,
  quickEncodeToken?: QuickEncodeToken,
  typeEncoders?: { [typeName: string]: OptionalTypeEncoder }
}
