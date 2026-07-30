import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";

import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";
import { BranchFinishedEvent } from "#gitwe/domain/events/BranchFinishedEvent";
import type { EventBus } from "#gitwe/domain/ports/EventBus";

export class EventPublishCapability implements Capability<FinishBranchCommand, FinishBranchResult> {
  readonly name = "event.publish.finish";
  readonly description = "Publish BranchFinishedEvent after finishing a branch";

  constructor(private readonly eventBus: EventBus) {}

  async execute(
    input: FinishBranchCommand,
    context: PipelineContext<FinishBranchCommand, FinishBranchResult>,
  ): Promise<FinishBranchResult> {
    if (!context.dryRun) {
      const merges = (context.metadata.get("mergeOutcomes") as any[]) || [];
      const tags = (context.metadata.get("createdTags") as string[]) || [];
      const deleted = (context.metadata.get("deleted") as boolean) || false;
      await this.eventBus.publish(
        new BranchFinishedEvent(
          input.branchName,
          merges.map((m) => m.target),
          tags,
          deleted,
        ),
      );
    }
    return context.output as FinishBranchResult;
  }
}
