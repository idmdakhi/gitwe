import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { EventBus } from "#gitwe/domain/ports/event-bus";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import { RuleEvaluator } from "#gitwe/domain/services/rule-evaluator";
import { BranchFinishedEvent } from "#gitwe/domain/events/branch-events";
import { AutoTagPolicy } from "#gitwe/domain/policies/auto-tag";
import { UnrecognizedBranchError } from "#gitwe/domain/errors/index";
import type { FinishBranchCommand } from "#gitwe/application/commands/finish-branch";
import type { FinishBranchResult, PropagatedUpdateDto } from "#gitwe/application/dto/results";

/**
 * Use case: finish a topic branch — merge it into its type's configured
 * parent base branch, optionally tag, optionally delete it, and propagate
 * the change to any base branches configured to auto-update from that
 * parent. Backs `gitwe <type> finish <name>` / `gitwe finish` (on the
 * current branch).
 *
 * With `dryRun: true`, every precondition is still checked, but no git
 * mutation is performed — the returned {@link FinishBranchResult}
 * describes what *would* happen.
 *
 * @public
 */
export class FinishBranchHandler {
  /**
   * @param workflow - The active workflow definition.
   * @param git - Port used to read and mutate repository state.
   * @param rules - Evaluates preconditions (clean working tree, branch exists) before mutating anything.
   * @param events - Port used to publish {@link BranchFinishedEvent} after a successful finish.
   */
  constructor(
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly rules: RuleEvaluator,
    private readonly events: EventBus,
  ) {}

  async handle(command: FinishBranchCommand): Promise<FinishBranchResult> {
    const rule = this.workflow.findRuleForBranch(command.branchName);
    if (!rule) throw new UnrecognizedBranchError(command.branchName);

    await this.rules.assertAllSatisfied({
      workflow: this.workflow,
      action: "finish",
      branchName: command.branchName,
      git: this.git,
    });

    const strategy = command.strategy ?? rule.upstreamStrategy;
    const shouldDelete = command.deleteAfterMerge ?? rule.deleteOnFinish;
    const tagName = AutoTagPolicy.tagNameFor(rule, command.branchName);

    if (command.dryRun) {
      const propagatedTo = this.workflow
        .autoUpdateChildrenOf(rule.parent)
        .map((child) => ({ branchName: child.name, from: rule.parent }));
      return {
        branchName: command.branchName,
        mergedInto: rule.parent,
        fastForward: false,
        ...(tagName !== undefined ? { tag: tagName } : {}),
        deleted: shouldDelete,
        propagatedTo,
        dryRun: true,
      };
    }

    const outcome = await this.git.merge(command.branchName, rule.parent, { strategy });

    if (tagName) {
      await this.git.createTag(tagName, `Release ${tagName}`);
    }

    const propagatedTo: PropagatedUpdateDto[] = [];
    for (const child of this.workflow.autoUpdateChildrenOf(rule.parent)) {
      if (child.downstreamStrategy === "rebase") {
        await this.git.rebase(child.name, rule.parent);
      } else {
        await this.git.merge(rule.parent, child.name, { strategy: "merge" });
      }
      propagatedTo.push({ branchName: child.name, from: rule.parent });
    }

    let deleted = false;
    if (shouldDelete) {
      const upstream = rule.keepRemote ? undefined : await this.git.getUpstream(command.branchName);
      await this.git.deleteBranch(command.branchName, true);
      deleted = true;
      if (upstream) {
        await this.git.deleteRemoteBranch(this.workflow.remote.remote, command.branchName);
      }
    }

    if (command.push) {
      await this.git.push(this.workflow.remote.remote, rule.parent, { tags: tagName !== undefined });
      for (const child of propagatedTo) {
        await this.git.push(this.workflow.remote.remote, child.branchName);
      }
    }

    await this.events.publish(
      new BranchFinishedEvent(command.branchName, rule.parent, tagName, deleted),
    );

    return {
      branchName: command.branchName,
      mergedInto: rule.parent,
      fastForward: outcome.fastForward,
      ...(tagName !== undefined ? { tag: tagName } : {}),
      deleted,
      propagatedTo,
      dryRun: false,
    };
  }
}
