import { NONE } from "./constants.js";

import type { None, Option, Some } from "./option.js";

export function some<T>(value: T): Some<T> {
  return Object.freeze({
    some: true,

    value,
  });
}

export function none(): None {
  return NONE;
}

export function fromNullable<T>(value: T | null | undefined): Option<T> {
  return value == null ? NONE : some(value);
}

export function isSome<T>(option: Option<T>): option is Some<T> {
  return option.some;
}

export function isNone<T>(option: Option<T>): option is None {
  return !option.some;
}
