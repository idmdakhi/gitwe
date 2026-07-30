import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";
import { HookPhase } from "#gitwe/domain/hooks/HookPhase";
import type { HookService } from "#gitwe/application/services/HookService";

export class HookExecutionCapability implements Capability<any, any> {
  readonly name = "validate.hook-execution";
  readonly description = "Execute pre/post hooks for the current phase";

  constructor(private readonly hookService: HookService) {}

  async execute(
    _input: any, // ← underscore اضافه شد
    context: PipelineContext<any, any>,
  ): Promise<any> {
    let phase: HookPhase;
    switch (context.currentStage) {
      case "validate":
        phase = HookPhase.PreFinish;
        break;
      case "finalize":
        phase = HookPhase.PostFinish;
        break;
      default:
        return context.output;
    }

    await this.hookService.run(phase, context.workflow.hooks);
    return context.output;
  }
}
