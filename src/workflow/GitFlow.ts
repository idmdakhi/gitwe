import { BaseWorkflow } from "./Workflow";

import type { FinishBranchOptions, StartBranchOptions } from "./types";

export class GitFlow extends BaseWorkflow {
  async startBranch(options: StartBranchOptions): Promise<void> {
    const branchType = this.config.types[options.type];

    if (!branchType) {
      throw new Error(`Unknown branch type "${options.type}".`);
    }

    const branchName = `${branchType.prefix}${options.name}`;

    console.log("Create branch:", branchName);

    console.log("Checkout from:", branchType.base);
  }

  async finishBranch(options: FinishBranchOptions): Promise<void> {
    console.log("Finish:", options.branch);
  }
}
