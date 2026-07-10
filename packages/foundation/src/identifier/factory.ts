import type { IdentifierGenerator } from "../contracts/identifier-generator.js";
import type { Identifier } from "./identifier.js";

export class IdentifierFactory {
  public constructor(private readonly generator: IdentifierGenerator) {}

  public create<T extends string>(): Identifier<T> {
    return this.generator.generate() as Identifier<T>;
  }
}
