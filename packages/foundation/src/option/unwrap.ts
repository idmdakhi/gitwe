import type { Option } from "./option.js";

export function unwrap<T>(option: Option<T>): T {
  if (!option.some) {
    throw new Error("Option is None.");
  }

  return option.value;
}

export function unwrapOr<T>(
  option: Option<T>,

  fallback: T,
): T {
  if (!option.some) {
    return fallback;
  }

  return option.value;
}
