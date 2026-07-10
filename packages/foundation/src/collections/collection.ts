export interface Collection<T> extends Iterable<T> {
  readonly size: number;

  isEmpty(): boolean;

  has(value: T): boolean;

  toArray(): readonly T[];
}
