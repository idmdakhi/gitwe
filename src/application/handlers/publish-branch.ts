import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { EventBus } from "#gitwe/domain/ports/event-bus";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import { RuleEvaluator } from "#gitwe/domain/services/rule-evaluator";
import { BranchPublishedEvent } from "#gitwe/domain/events/branch-events";
import type { PublishBranchCommand } from "#gitwe/application/commands/publish-branch";
import type { PublishBranchResult } from "#gitwe/application/dto/results";

/**
 * Use case: push a local branch to the workflow's remote and set it up to
 * track the resulting remote branch, so subsequent `push`/`pull` need no
 * arguments. Backs `gitwe publish <name>` / `gitwe publish` (on the
 * current branch).
 *
 * @public
 */
export class PublishBranchHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly rules: RuleEvaluator,
    private readonly events: EventBus,
  ) {}

  async handle(command: PublishBranchCommand): Promise<PublishBranchResult> {
    await this.rules.assertAllSatisfied({
      workflow: this.workflow,
      action: "publish",
      branchName: command.branchName,
      git: this.git,
    });

    const remote = this.workflow.remote.remote;
    await this.git.push(remote, command.branchName, { setUpstream: true });
    await this.events.publish(new BranchPublishedEvent(command.branchName, remote));

    return { branchName: command.branchName, remote };
  }
}
