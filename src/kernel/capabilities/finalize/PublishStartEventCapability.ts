import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";

import type { StartBranchCommand } from "#gitwe/application/commands/StartBranchCommand";
import type { StartBranchResult } from "#gitwe/application/dto/StartBranchResult";
import type { EventBus } from "#gitwe/domain/ports/EventBus";
import type { BranchTypeRule } from "#gitwe/domain/valueObjects/BranchTypeRule";
import { BranchStartedEvent } from "#gitwe/domain/events/BranchStartedEvent";

export class PublishStartEventCapability implements Capability<
  StartBranchCommand,
  StartBranchResult
> {
  readonly name = "event.publish.start";
  readonly description = "Publish BranchStartedEvent";

  constructor(private readonly eventBus: EventBus) {}

  async execute(
    _input: StartBranchCommand,
    context: PipelineContext<StartBranchCommand, StartBranchResult>,
  ): Promise<StartBranchResult> {
    const branchName = context.metadata.get("createdBranch") as string;
    const rule = context.metadata.get("branchRule") as BranchTypeRule;

    if (!branchName || !rule) {
      throw new Error("Missing branch data for event publishing");
    }

    if (!context.dryRun) {
      await this.eventBus.publish(new BranchStartedEvent(branchName, rule.name, rule.baseBranch));
    }

    return context.output as StartBranchResult;
  }
}
