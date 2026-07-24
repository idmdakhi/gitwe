export class Result<T, E = Error> {
  private constructor(
    private readonly _value?: T,
    private readonly _error?: E,
  ) {}

  static ok<T, E = Error>(value: T): Result<T, E> {
    return new Result(value);
  }

  static fail<T, E = Error>(error: E): Result<T, E> {
    return new Result(undefined, error);
  }

  isOk(): this is { value: T } {
    return this._value !== undefined;
  }

  isFail(): this is { error: E } {
    return this._error !== undefined;
  }

  get value(): T {
    if (this.isFail()) throw this._error;
    return this._value!;
  }

  get error(): E | undefined {
    return this._error;
  }

  unwrap(): T {
    if (this.isFail()) throw this._error;
    return this._value!;
  }

  unwrapOr(defaultValue: T): T {
    return this.isOk() ? this.value : defaultValue;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return this.isOk() ? Result.ok(fn(this.value)) : Result.fail(this.error);
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return this.isOk() ? fn(this.value) : Result.fail(this.error);
  }
}
