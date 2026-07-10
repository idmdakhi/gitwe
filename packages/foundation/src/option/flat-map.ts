import type { Option } from "./option.js";

export function flatMap<T, U>(
  option: Option<T>,

  mapper: (value: T) => Option<U>,
): Option<U> {
  if (!option.some) {
    return option;
  }

  return mapper(option.value);
}
