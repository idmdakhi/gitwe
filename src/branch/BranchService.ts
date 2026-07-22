import type { GitRepository } from "../git";

import type { GitweConfig } from "../config";

import { BranchFactory } from "./BranchFactory";

import { BranchValidator } from "./BranchValidator";

export class BranchService {
  private readonly validator;

  private readonly factory;

  constructor(
    private readonly config: GitweConfig,

    private readonly git: GitRepository,
  ) {
    this.validator = new BranchValidator(config);

    this.factory = new BranchFactory(config);
  }

  async create(
    type: string,

    name: string,
  ) {
    this.validator.validate(
      type,

      name,
    );

    const branch = this.factory.create(
      type,

      name,
    );

    if (await this.git.hasBranch(branch.fullName)) {
      throw new Error(`Branch "${branch.fullName}" already exists.`);
    }

    await this.git.checkout(branch.base);

    await this.git.createBranch({
      name: branch.fullName,

      from: branch.base,
    });

    return branch;
  }
}

