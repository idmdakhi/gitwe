import type { Option } from "./option.js";

export function match<T, R>(
  option: Option<T>,

  some: (value: T) => R,

  none: () => R,
): R {
  if (!option.some) {
    return none();
  }

  return some(option.value);
}
