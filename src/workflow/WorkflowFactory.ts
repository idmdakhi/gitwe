import type { GitweConfig } from "../config";

import { GitFlow } from "./GitFlow";

import type { Workflow } from "./types";

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
