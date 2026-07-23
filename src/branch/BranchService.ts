// src/branch/BranchService.ts
import type { GitRepository } from "#gitwe/domain/ports/GitRepository"; // تغییر مسیر
import type { GitweConfig } from "#gitwe/config";
import { BranchFactory } from "#gitwe/branch/BranchFactory";
import { BranchValidator } from "#gitwe/branch/BranchValidator";

export class BranchService {
  private readonly validator: BranchValidator;
  private readonly factory: BranchFactory;
  private readonly config: GitweConfig;

  constructor(
    config: GitweConfig,
    private readonly git: GitRepository, // نوع جدید
  ) {
    this.config = config;
    this.config;
    this.validator = new BranchValidator(config);
    this.factory = new BranchFactory(config);
  }

  async create(type: string, name: string) {
    this.validator.validate(type, name);
    const branch = this.factory.create(type, name);

    // استفاده از branchExists به جای hasBranch
    if (await this.git.branchExists(branch.fullName)) {
      throw new Error(`Branch "${branch.fullName}" already exists.`);
    }

    // checkout ابتدا به base
    await this.git.checkout(branch.base);

    // createBranch با امضای جدید: name و options
    await this.git.createBranch(branch.fullName, { from: branch.base, checkout: false });

    return branch;
  }
}
