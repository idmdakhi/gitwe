import type { Option } from "./option.js";

import { none, some } from "./functions.js";

export function map<T, U>(
  option: Option<T>,

  mapper: (value: T) => U,
): Option<U> {
  if (!option.some) {
    return none();
  }

  return some(mapper(option.value));
}
