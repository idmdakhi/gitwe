import type { GitweConfig } from "../config";

import type { FinishBranchOptions, StartBranchOptions, Workflow } from "./types";

export abstract class BaseWorkflow implements Workflow {
  constructor(protected readonly config: GitweConfig) {}

  abstract startBranch(options: StartBranchOptions): Promise<void>;

  abstract finishBranch(options: FinishBranchOptions): Promise<void>;
}
