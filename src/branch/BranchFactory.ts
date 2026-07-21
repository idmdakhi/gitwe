import type { GitweConfig } from "../config";

import { Branch } from "./Branch";

import { BranchName } from "./BranchName";

import { BranchType } from "./BranchType";

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
