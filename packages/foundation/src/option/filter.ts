import type { Option } from "./option.js";

import { none } from "./functions.js";

export function filter<T>(
  option: Option<T>,

  predicate: (value: T) => boolean,
): Option<T> {
  if (!option.some) {
    return option;
  }

  if (!predicate(option.value)) {
    return none();
  }

  return option;
}
