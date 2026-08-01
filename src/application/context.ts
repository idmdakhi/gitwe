import type { Logger } from "./ports/Logger.js";
import type { Workflow } from "../domain/workflow.js";
import type { GitRepository } from "./ports/GitRepository.js";
import type { HookRunner } from "./ports/HookRunner.js";
import type { OperationStateStore } from "./ports/OperationState.js";

export interface EngineContext {
  git: GitRepository;
  workflow: Workflow;
  /** Absolute repository root. */
  root: string;
  logger: Logger;
  hooks: HookRunner;
  state: OperationStateStore;
}

/** Expand the git-flow style placeholders supported in message options. */
export function expandMessage(
  template: string,
  values: { branch: string; parent: string },
): string {
  return template.replace(/%([bBpP%])/g, (_match, key: string) => {
    switch (key) {
      case "b":
        return values.branch;
      case "B":
        return `refs/heads/${values.branch}`;
      case "p":
        return values.parent;
      case "P":
        return `refs/heads/${values.parent}`;
      default:
        return "%";
    }
  });
}
