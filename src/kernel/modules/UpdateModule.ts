import type { KernelModule } from "#gitwe/kernel/KernelModule";
import type { TransitionRuntime } from "#gitwe/kernel/pipeline/TransitionRuntime";
import type { PipelineContext, PipelineResult } from "#gitwe/kernel/pipeline/Stage";
import { PipelineStage } from "#gitwe/kernel/pipeline/Stage";
import type { UpdateBranchCommand } from "#gitwe/application/commands/UpdateBranchCommand";
import type { UpdateBranchResult } from "#gitwe/application/dto/UpdateBranchResult";
import type { Workflow } from "#gitwe/domain/aggregates/Workflow";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { EventBus } from "#gitwe/domain/ports/EventBus";
import type { StateStore } from "#gitwe/domain/ports/StateStore";
import type { Logger } from "#gitwe/shared/logging/logger";

export class UpdateModule implements KernelModule<UpdateBranchCommand, UpdateBranchResult> {
  readonly name = "update";
  readonly description = "Update a branch with changes from its base";

  constructor(
    private readonly runtime: TransitionRuntime,
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly eventBus: EventBus,
    private readonly stateStore: StateStore,
    private readonly logger: Logger,
  ) {}

  async execute(input: UpdateBranchCommand): Promise<UpdateBranchResult> {
    const context: PipelineContext<UpdateBranchCommand, UpdateBranchResult> = {
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
      dryRun: false,
      failed: false,
      error: undefined,
    };

    const stages = this.workflow.pipelines?.update ?? [
      PipelineStage.VALIDATE,
      PipelineStage.TRANSITION,
      PipelineStage.FINALIZE,
    ];

    const result: PipelineResult<UpdateBranchResult> = await this.runtime.run(stages, context);

    if (!result.output) {
      throw new Error("Update pipeline did not produce an output");
    }

    return result.output;
  }
}
