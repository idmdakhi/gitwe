import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { EventBus } from "#gitwe/domain/ports/EventBus";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import { HookPhase } from "#gitwe/domain/hooks/HookPhase";
import { BranchFinishedEvent } from "#gitwe/domain/events/BranchFinishedEvent";
import { UnrecognizedBranchError, BranchNotFoundError } from "#gitwe/domain/errors/index";
import type { Logger } from "#gitwe/shared/logging/Logger";
import { RuleEvaluator } from "#gitwe/domain/services/RuleEvaluator";
import { MergeService } from "#gitwe/application/services/MergeService";
import { TagService } from "#gitwe/application/services/TagService";
import { HookService } from "#gitwe/application/services/HookService";
import { RemoteService } from "#gitwe/application/services/RemoteService";
import { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";

/**
 * Use case: finish a branch — merge it into every configured target, tag
 * it if configured, delete it, and push if configured. Same shape as
 * `StartBranchHandler`: pure sequencing, all real logic lives in services.
 */
export class FinishBranchHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly ruleEvaluator: RuleEvaluator,
    private readonly mergeService: MergeService,
    private readonly tagService: TagService,
    private readonly hookService: HookService,
    private readonly remoteService: RemoteService,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
  ) {}

  async handle(command: FinishBranchCommand): Promise<FinishBranchResult> {
    const { branchName, deleteAfterMerge = true, pushAfterFinish = false } = command;

    if (!(await this.git.branchExists(branchName))) {
      throw new BranchNotFoundError(branchName);
    }
    const rule = this.workflow.findRuleForBranch(branchName);
    if (!rule) throw new UnrecognizedBranchError(branchName);

    await this.ruleEvaluator.assertAllSatisfied({
      workflow: this.workflow,
      action: "finish",
      branchName,
      git: this.git,
    });

    await this.hookService.run(HookPhase.PreFinish, this.workflow.hooks);

    const outcomes = await this.mergeService.mergeIntoAllTargets(branchName, rule);
    const tagName = await this.tagService.tagIfConfigured(branchName, rule);

    let deleted = false;
    if (deleteAfterMerge && rule.deleteOnFinish) {
      await this.git.deleteBranch(branchName);
      deleted = true;
    }

    await this.hookService.run(HookPhase.PostFinish, this.workflow.hooks);
    await this.remoteService.pushIfNeeded(this.workflow.remote, pushAfterFinish);

    const tags = tagName ? [tagName] : [];
    await this.eventBus.publish(
      new BranchFinishedEvent(
        branchName,
        outcomes.map((o) => o.target),
        tags,
        deleted,
      ),
    );
    this.logger.info(`Finished branch ${branchName}`);

    return {
      merges: outcomes.map((o) => ({
        source: o.source,
        target: o.target,
        fastForward: o.fastForward,
      })),
      tags,
      deleted,
    };
  }
}
