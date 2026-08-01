import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";

/** The workflow action being validated by a {@link Rule}. @public */
export type WorkflowAction = "start" | "finish" | "update" | "delete" | "publish" | "rename" | "checkout";

/** Everything a {@link Rule} needs to decide whether an action is currently allowed. @public */
export interface RuleContext {
  readonly workflow: Workflow;
  readonly action: WorkflowAction;
  readonly branchName: string;
  readonly baseBranch?: string;
  readonly git: GitRepository;
}
