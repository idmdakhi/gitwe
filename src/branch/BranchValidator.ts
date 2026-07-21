import type { GitweConfig } from "../config";

export class BranchValidator {
  constructor(private readonly config: GitweConfig) {}

  validate(
    branchType: string,

    name: string,
  ) {
    const type = this.config.types[branchType];

    if (!type) {
      throw new Error(`Unknown branch type "${branchType}".`);
    }

    if (name.length > this.config.branchNaming.maxLength) {
      throw new Error("Branch name is too long.");
    }

    if (name.length === 0) {
      throw new Error("Branch name is empty.");
    }
  }
}
