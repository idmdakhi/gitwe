export class BooleanSchema implements Schema<boolean> {
  public readonly kind = "boolean";

  public validate(value: unknown): value is boolean {
    return typeof value === "boolean";
  }
}
