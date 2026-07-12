export class StringSchema implements Schema<string> {
  public readonly kind = "string";

  public validate(value: unknown): value is string {
    return typeof value === "string";
  }
}
