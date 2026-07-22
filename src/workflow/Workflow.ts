import type { GitweConfig } from "#gitwe/config";

import type { FinishBranchOptions, StartBranchOptions, Workflow } from "#gitwe/workflow/types";

export abstract class BaseWorkflow implements Workflow {
  constructor(protected readonly config: GitweConfig) {}

  abstract startBranch(options: StartBranchOptions): Promise<void>;

  abstract finishBranch(options: FinishBranchOptions): Promise<void>;
}
