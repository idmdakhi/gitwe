import type { Result } from "./result.js";

export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}
