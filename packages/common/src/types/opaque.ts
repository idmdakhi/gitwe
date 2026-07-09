declare const __opaque: unique symbol;

export type Opaque<Type, Token> = Type & {
  readonly [__opaque]: Token;
};
