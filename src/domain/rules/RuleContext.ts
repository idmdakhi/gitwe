import { GitRepository } from "#gitwe/domain/ports/GitRepository";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";

export type WorkflowAction = "start" | "finish";

/** Everything a `Rule` needs to decide whether an action is allowed. */
export interface RuleContext {
  readonly workflow: Workflow;
  readonly action: WorkflowAction;
  readonly branchName: string;
  readonly baseBranch?: string;
  readonly git: GitRepository;
}
