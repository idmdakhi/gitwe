import type { BranchTypeConfig } from "../config";

export class BranchType {
  constructor(
    readonly name: string,

    readonly config: BranchTypeConfig,
  ) {}

  get prefix() {
    return this.config.prefix;
  }

  get base() {
    return this.config.base;
  }

  get targets() {
    return Array.isArray(this.config.target) ? this.config.target : [this.config.target];
  }
}
