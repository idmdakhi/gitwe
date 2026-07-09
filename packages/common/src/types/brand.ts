declare const __brand: unique symbol;

/**
 * Creates a nominal type from a primitive type.
 *
 * Example:
 *
 * type RepositoryId = Brand<string,"RepositoryId">
 */
export type Brand<T, Name extends string> = T & {
  readonly [__brand]: Name;
};
