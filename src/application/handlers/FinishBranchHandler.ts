import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { EventBus } from "#gitwe/domain/ports/EventBus";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import { HookPhase } from "#gitwe/domain/hooks/HookPhase";
import { BranchFinishedEvent } from "#gitwe/domain/events/BranchFinishedEvent";
import {
  UnrecognizedBranchError,
  BranchNotFoundError,
  ProtectedBranchError,
} from "#gitwe/domain/errors";
import { AutoTagPolicy } from "#gitwe/domain/policies/AutoTagPolicy";
import type { Logger } from "#gitwe/shared/logging/Logger";
import { RuleEvaluator } from "#gitwe/domain/services/RuleEvaluator";
import { MergeService } from "#gitwe/application/services/MergeService";
import { TagService } from "#gitwe/application/services/TagService";
import { HookService } from "#gitwe/application/services/HookService";
import { RemoteService } from "#gitwe/application/services/RemoteService";
import type { VersionService } from "#gitwe/application/services/VersionService";
import { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";

/**
 * Use case: finish a branch — merge it into every configured target, tag
 * it if configured, delete it, and push if configured.
 * Supports dryRun: validates and returns the plan without mutating git.
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
    private readonly versionService: VersionService,
  ) {}

  async handle(command: FinishBranchCommand): Promise<FinishBranchResult> {
    const {
      branchName,
      deleteAfterMerge = true,
      pushAfterFinish = false,
      dryRun = false,
      strategy,
    } = command;

    if (!(await this.git.branchExists(branchName))) {
      throw new BranchNotFoundError(branchName);
    }

    const rule = this.workflow.findRuleForBranch(branchName);
    if (!rule) throw new UnrecognizedBranchError(branchName);

    if (this.workflow.isProtected(branchName)) {
      throw new ProtectedBranchError(branchName, "finished");
    }

    await this.ruleEvaluator.assertAllSatisfied({
      workflow: this.workflow,
      action: "finish",
      branchName,
      git: this.git,
    });

    const willDelete = deleteAfterMerge && rule.deleteOnFinish;
    const tagName = AutoTagPolicy.tagNameFor(rule, branchName);
    const resolvedStrategy = strategy ?? rule.mergeStrategy ?? this.workflow.mergeStrategy;

    // Optional version bump (only when explicitly configured on the branch type)
    if (rule.autoTag && rule.bumpVersion) {
      try {
        const bumpResult = await this.versionService.bump(rule.bumpVersion, undefined, dryRun);
        this.logger.info(
          `Version bumped: ${bumpResult.previous.toString()} → ${bumpResult.next.toString()}`,
        );
      } catch (error) {
        this.logger.warn(
          `Version bump failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue — version bump failure must not block finish
      }
    }

    if (dryRun) {
      return {
        dryRun: true,
        merges: rule.mergeTargets.map((target) => ({
          source: branchName,
          target,
          fastForward: false,
        })),
        tags: tagName ? [tagName] : [],
        deleted: willDelete,
      };
    }

    await this.hookService.run(HookPhase.PreFinish, this.workflow.hooks);

    const outcomes = await this.mergeService.mergeIntoAllTargets(
      branchName,
      rule,
      resolvedStrategy,
    );
    const createdTag = await this.tagService.tagIfConfigured(branchName, rule);

    let deleted = false;
    if (willDelete) {
      // Squash leaves no shared history, so force-delete is required
      await this.git.deleteBranch(branchName, resolvedStrategy === "squash");
      deleted = true;
    }

    await this.hookService.run(HookPhase.PostFinish, this.workflow.hooks);
    await this.remoteService.pushIfNeeded(this.workflow.remote, pushAfterFinish);

    const tags = createdTag ? [createdTag] : [];

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
      dryRun: false,
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
