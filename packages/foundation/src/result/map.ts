import type { Result } from "./result.js";
import { ok } from "./functions.js";

export function map<T, U, E>(
  result: Result<T, E>,
  mapper: (value: T) => U,
): Result<U, E> {
  if (!result.ok) {
    return result;
  }

  return ok(mapper(result.value));
}
