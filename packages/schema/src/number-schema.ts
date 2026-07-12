export class NumberSchema implements Schema<number> {
  public readonly kind = "number";

  public validate(value: unknown): value is number {
    return typeof value === "number";
  }
}
