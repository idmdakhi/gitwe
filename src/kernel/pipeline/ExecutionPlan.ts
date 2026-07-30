// src/kernel/pipeline/ExecutionPlan.ts
import { PipelineStage } from "#gitwe/kernel/pipeline/Stage";
import type { Workflow } from "#gitwe/domain/aggregates/Workflow";
import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { StartBranchCommand } from "#gitwe/application/commands/StartBranchCommand";

export interface PlanStep {
  /** نام قابلیت (Capability) */
  capability: string;
  /** پارامترهای ورودی برای این گام */
  input?: any;
  /** شرط اجرا (اختیاری) */
  condition?: string;
}

export interface PlanStage {
  stage: PipelineStage;
  steps: PlanStep[];
}

export interface ExecutionPlan {
  /** نام Plan (مثلاً finish یا start) */
  name: string;
  /** مراحل به ترتیب اجرا */
  stages: PlanStage[];
  /** توضیحات (برای نمایش) */
  description?: string;
}

/**
 * Builder برای ساخت ExecutionPlan از روی تنظیمات
 */
export class ExecutionPlanBuilder {
  static buildForFinish(workflow: Workflow, command: FinishBranchCommand): ExecutionPlan {
    const rule = workflow.findRuleForBranch(command.branchName);
    const stages: PlanStage[] = [];

    // === Stage: Validate ===
    const validateSteps: PlanStep[] = [
      { capability: "validate.branch-exists", input: { branchName: command.branchName } },
      { capability: "validate.working-tree-clean" },
    ];
    if (workflow.isProtected(command.branchName)) {
      validateSteps.push({ capability: "validate.protected-branch" });
    }
    stages.push({ stage: PipelineStage.VALIDATE, steps: validateSteps });

    // === Stage: Transition ===
    const transitionSteps: PlanStep[] = [
      {
        capability: "transition.merge",
        input: {
          branchName: command.branchName,
          strategy: command.strategy ?? rule?.mergeStrategy ?? workflow.mergeStrategy,
        },
      },
    ];
    if (command.deleteAfterMerge !== false && rule?.deleteOnFinish) {
      transitionSteps.push({
        capability: "transition.delete-branch",
        input: { branchName: command.branchName, force: command.strategy === "squash" },
      });
    }
    stages.push({ stage: PipelineStage.TRANSITION, steps: transitionSteps });

    // === Stage: PostTransition ===
    const postSteps: PlanStep[] = [];
    if (rule?.bumpVersion && rule.bumpVersion !== "none") {
      postSteps.push({
        capability: "post.version-bump",
        input: { bump: rule.bumpVersion, dryRun: command.dryRun },
      });
    }
    if (rule?.autoTag) {
      postSteps.push({
        capability: "post.tag",
        input: { branchName: command.branchName, prefix: rule.autoTag.prefix ?? "v" },
      });
    }
    if (workflow.versioning?.changelog?.enabled) {
      postSteps.push({
        capability: "post.changelog",
        input: { path: workflow.versioning.changelog.path ?? "CHANGELOG.md" },
      });
    }
    if (postSteps.length > 0) {
      stages.push({ stage: PipelineStage.POST_TRANSITION, steps: postSteps });
    }

    // === Stage: Finalize ===
    const finalizeSteps: PlanStep[] = [];
    const remote = workflow.remote;
    if (remote.autoPush || command.pushAfterFinish) {
      finalizeSteps.push({
        capability: "finalize.push",
        input: { remote: remote.remote, branch: command.branchName },
      });
    }
    finalizeSteps.push({
      capability: "event.publish.finish",
      input: { branchName: command.branchName },
    });
    if (finalizeSteps.length > 0) {
      stages.push({ stage: PipelineStage.FINALIZE, steps: finalizeSteps });
    }

    return {
      name: "finish",
      description: `Finish branch ${command.branchName}`,
      stages,
    };
  }

  static buildForStart(workflow: Workflow, command: StartBranchCommand): ExecutionPlan {
    const rule = workflow.findBranchType(command.branchType);
    const fullName = `${rule?.prefix ?? ""}${command.shortName}`;

    const stages: PlanStage[] = [];

    // Validate
    stages.push({
      stage: PipelineStage.VALIDATE,
      steps: [
        { capability: "validate.branch-does-not-exist", input: { branchName: fullName } },
        { capability: "validate.base-branch-exists", input: { baseBranch: rule?.baseBranch } },
        { capability: "validate.branch-naming", input: { shortName: command.shortName } },
      ],
    });

    // Transition
    stages.push({
      stage: PipelineStage.TRANSITION,
      steps: [
        {
          capability: "transition.create-branch",
          input: { branchType: command.branchType, shortName: command.shortName },
        },
      ],
    });

    // Finalize
    const finalizeSteps: PlanStep[] = [
      { capability: "event.publish.start", input: { branchName: fullName } },
    ];
    if (workflow.remote.autoPush) {
      finalizeSteps.push({
        capability: "finalize.push",
        input: { remote: workflow.remote.remote, branch: fullName },
      });
    }
    stages.push({ stage: PipelineStage.FINALIZE, steps: finalizeSteps });

    return {
      name: "start",
      description: `Start branch ${fullName}`,
      stages,
    };
  }
}
