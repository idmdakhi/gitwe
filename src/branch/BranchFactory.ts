import type { GitweConfig } from "#gitwe/config";

import { Branch } from "#gitwe/branch/Branch";

import { BranchName } from "#gitwe/branch/BranchNaming";

import { BranchType } from "#gitwe/branch/BranchType";

export class BranchFactory {
  constructor(private readonly config: GitweConfig) {}

  create(
    typeName: string,

    rawName: string,
  ) {
    const type = new BranchType(
      typeName,

      this.config.types[typeName],
    );

    const normalized = BranchName.normalize(
      rawName,

      this.config.branchNaming,
    );

    return new Branch(
      typeName,

      normalized,

      `${type.prefix}${normalized}`,

      type.base,

      type.targets,
    );
  }
}
