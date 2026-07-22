import type { GitweConfig } from "#gitwe/config";

import { GitFlow } from "#gitwe/workflow/GitFlow";

import type { Workflow } from "#gitwe/workflow/types";

export class WorkflowFactory {
  static create(config: GitweConfig): Workflow {
    switch (config.workflow) {
      case "git-flow":
        return new GitFlow(config);

      default:
        throw new Error(`Unsupported workflow "${config.workflow}".`);
    }
  }
}
