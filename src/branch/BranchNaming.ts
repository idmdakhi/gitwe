import type { BranchNamingConfig } from "../config";

export class BranchName {
  static normalize(
    value: string,

    config: BranchNamingConfig,
  ): string {
    let name = value.trim();

    switch (config.case) {
      case "kebab-case":
        name = name

          .replace(/\s+/g, "-")

          .replace(/_/g, "-")

          .toLowerCase();

        break;

      case "snake_case":
        name = name

          .replace(/\s+/g, "_")

          .replace(/-/g, "_")

          .toLowerCase();

        break;

      case "camelCase":
        break;
    }

    return name;
  }
}
