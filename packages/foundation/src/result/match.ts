import type { Result } from "./result.js";

export function match<T, E, R>(
  result: Result<T, E>,

  success: (value: T) => R,

  failure: (error: E) => R,
): R {
  if (result.ok) {
    return success(result.value);
  }

  return failure(result.error);
}
