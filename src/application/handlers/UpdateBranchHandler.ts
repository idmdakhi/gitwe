import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import {
  UnrecognizedBranchError,
  BranchNotFoundError,
  WorkflowRuleViolationError,
} from "#gitwe/domain/errors";
import type { Logger } from "#gitwe/shared/logging/Logger";
import { UpdateBranchCommand } from "#gitwe/application/commands/UpdateBranchCommand";
import { UpdateBranchResult } from "#gitwe/application/dto/UpdateBranchResult";

/**
 * Use case: bring a topic branch up to date with its base branch, either by
 * merging the base in or by rebasing onto it — the "downstream" direction,
 * as opposed to `finish`'s "upstream" direction (topic branch -> its
 * targets). A long-lived feature branch typically wants this run
 * periodically so it doesn't drift too far from `develop`/`main`.
 */
export class UpdateBranchHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly logger: Logger,
  ) {}

  async handle(command: UpdateBranchCommand): Promise<UpdateBranchResult> {
    const { branchName, strategy } = command;

    if (!(await this.git.branchExists(branchName))) {
      throw new BranchNotFoundError(branchName);
    }
    const rule = this.workflow.findRuleForBranch(branchName);
    if (!rule) throw new UnrecognizedBranchError(branchName);

    const parent = rule.baseBranch;
    if (!(await this.git.branchExists(parent))) {
      throw new BranchNotFoundError(parent);
    }

    if (!(await this.git.isWorkingTreeClean())) {
      throw new WorkflowRuleViolationError(
        "WorkingTreeClean",
        "working tree has uncommitted changes; commit or stash them first",
      );
    }

    const resolvedStrategy = strategy ?? rule.downstreamStrategy ?? "merge";

    if (resolvedStrategy === "rebase") {
      await this.git.rebase(branchName, parent);
      this.logger.info(`Rebased ${branchName} onto ${parent}`);
      return { branchName, parent, strategy: "rebase" };
    }

    const outcome = await this.git.merge(parent, branchName, { noFastForward: false });
    this.logger.info(`Updated ${branchName} from ${parent}`);
    return { branchName, parent, strategy: "merge", fastForward: outcome.fastForward };
  }
}
