import type { Failure, Result, Success } from "./result.js";

export function ok<T>(value: T): Success<T> {
  return {
    ok: true,
    value,
  };
}

export function fail<E>(error: E): Failure<E> {
  return {
    ok: false,
    error,
  };
}

export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.ok;
}

export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.ok;
}
