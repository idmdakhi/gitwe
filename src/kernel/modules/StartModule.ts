// src/kernel/modules/StartModule.ts
import type { KernelModule } from "#gitwe/kernel/KernelModule";
import type { TransitionRuntime } from "#gitwe/kernel/pipeline/TransitionRuntime";
import { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { StartBranchCommand } from "#gitwe/application/commands/StartBranchCommand";
import type { StartBranchResult } from "#gitwe/application/dto/StartBranchResult";
import type { Workflow } from "#gitwe/domain/aggregates/Workflow";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { EventBus } from "#gitwe/domain/ports/EventBus";
import type { StateStore } from "#gitwe/domain/ports/StateStore";
import type { Logger } from "#gitwe/shared/logging/Logger";
import { ExecutionPlanBuilder } from "#gitwe/kernel/pipeline/ExecutionPlan";
import { PipelineState } from "#gitwe/kernel/pipeline/PipelineState";

export class StartModule implements KernelModule<StartBranchCommand, StartBranchResult> {
  readonly name = "start";
  readonly description = "Start a new branch through a pipeline of capabilities";

  constructor(
    private readonly runtime: TransitionRuntime,
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly eventBus: EventBus,
    private readonly stateStore: StateStore,
    private readonly logger: Logger,
  ) {}

  async execute(input: StartBranchCommand): Promise<StartBranchResult> {
    const plan = ExecutionPlanBuilder.buildForStart(this.workflow, input);

    const context: PipelineContext<StartBranchCommand, StartBranchResult> = {
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
      state: new PipelineState(),
    };

    const stages = plan.stages.map((s) => s.stage);
    const result = await this.runtime.run(stages, context);

    if (!result.output) {
      throw new Error("Start pipeline did not produce an output");
    }

    return result.output;
  }
}
