import type { Result } from "./result.js";

export function flatMap<T, U, E>(
  result: Result<T, E>,
  mapper: (value: T) => Result<U, E>,
): Result<U, E> {
  if (!result.ok) {
    return result;
  }

  return mapper(result.value);
}
