import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { GitweConfig } from "#gitwe/config";

export interface FinishOptions {
  branchType: string;

  branchName: string;
}

export class FinishBranchAction {
  constructor(
    private readonly config: GitweConfig,

    private readonly git: GitRepository,
  ) {}

  async execute(options: FinishOptions) {
    const type = this.config.types[options.branchType];

    if (!type) {
      throw new Error("Unknown branch type.");
    }

    const targets = Array.isArray(type.target) ? type.target : [type.target];

    for (const target of targets) {
      await this.git.checkout(target);

      await this.git.merge(
        `${type.prefix}${options.branchName}`,

        target,
      );
    }

    if (type.tag) {
      if (this.config.tag.enabled) {
        await this.git.createTag(`${this.config.tag.prefix}${options.branchName}`);
      }
    }

    if (type.deleteAfterFinish) {
      await this.git.deleteBranch(`${type.prefix}${options.branchName}`);
    }
  }
}
