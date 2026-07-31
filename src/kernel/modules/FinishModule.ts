// src/kernel/modules/FinishModule.ts
import type { KernelModule } from "#gitwe/kernel/KernelModule";
import type { TransitionRuntime } from "#gitwe/kernel/pipeline/TransitionRuntime";
import { PipelineContext, PipelineResult } from "#gitwe/kernel/pipeline/Stage";
import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";
import type { Workflow } from "#gitwe/domain/aggregates/Workflow";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { EventBus } from "#gitwe/domain/ports/EventBus";
import type { StateStore } from "#gitwe/domain/ports/StateStore";
import type { Logger } from "#gitwe/shared/logging/logger";
import { ExecutionPlanBuilder } from "#gitwe/kernel/pipeline/ExecutionPlan";
import { PipelineState } from "#gitwe/kernel/pipeline/PipelineState";

export class FinishModule implements KernelModule<FinishBranchCommand, FinishBranchResult> {
  readonly name = "finish";
  readonly description = "Finish a branch through a pipeline of capabilities";

  constructor(
    private readonly runtime: TransitionRuntime,
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly eventBus: EventBus,
    private readonly stateStore: StateStore,
    private readonly logger: Logger,
  ) {}

  async execute(input: FinishBranchCommand): Promise<FinishBranchResult> {
    // ۱. ساخت Execution Plan
    const plan = ExecutionPlanBuilder.buildForFinish(this.workflow, input);

    // ۲. اگر حالت dry-run است، فقط Plan را نمایش بده
    if (input.dryRun) {
      // در اینجا می‌توان Plan را به‌عنوان خروجی JSON بازگرداند
      return {
        dryRun: true,
        merges: [],
        tags: [],
        deleted: false,
        // می‌توان plan را هم در metadata قرار داد
      } as FinishBranchResult;
    }

    // ۳. آماده‌سازی Context
    const context: PipelineContext<FinishBranchCommand, FinishBranchResult> = {
      input,
      output: undefined,
      metadata: new Map(),
      stageResults: new Map(),
      currentStage: undefined,
      workflow: this.workflow,
      git: this.git,
      eventBus: this.eventBus,
      stateStore: this.stateStore,
      logger: this.logger,
      dryRun: input.dryRun ?? false,
      failed: false,
      error: undefined,
      state: new PipelineState(),
    };

    // ۴. استخراج Stages از Plan
    const stages = plan.stages.map((s) => s.stage);

    // ۵. اجرا
    const result: PipelineResult<FinishBranchResult> = await this.runtime.run(stages, context);

    if (!result.output) {
      throw new Error("Finish pipeline did not produce an output");
    }

    return result.output;
  }
}
