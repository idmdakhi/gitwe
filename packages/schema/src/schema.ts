export interface Schema<T> {
  readonly kind: string;

  validate(value: unknown): value is T;
}
