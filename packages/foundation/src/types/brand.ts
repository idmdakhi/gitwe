declare const BRAND: unique symbol;

/**
 * Creates a nominal type from an existing type.
 *
 * Example:
 *
 * type UserId = Brand<string, "UserId">
 */
export type Brand<T, Name extends string> = T & {
  readonly [BRAND]: Name;
};
