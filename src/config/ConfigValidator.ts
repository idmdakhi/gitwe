import type { GitweConfig } from "#gitwe/config/types";

export class ConfigValidator {
  validate(config: GitweConfig): void {
    for (const type of Object.values(config.types)) {
      if (!type.prefix.endsWith("/")) {
        throw new Error(`Invalid prefix "${type.prefix}".`);
      }

      if (type.base.length === 0) {
        throw new Error("Base branch cannot be empty.");
      }
    }

    if (config.branchNaming.maxLength < 10) {
      throw new Error("branchNaming.maxLength must be >= 10");
    }
  }
}
