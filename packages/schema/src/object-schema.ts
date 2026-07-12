export interface Property {
  readonly name: string;

  readonly schema: Schema<any>;

  readonly required: boolean;
}

export class ObjectSchema implements Schema<object> {
  public readonly kind = "object";

  public constructor(public readonly properties: readonly Property[]) {}

  public validate(value: unknown): value is object {
    if (typeof value !== "object") {
      return false;
    }

    return true;
  }
}
