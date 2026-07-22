import type { EventBus } from "#gitwe/domain/ports/EventBus";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import { HookPhase } from "#gitwe/domain/hooks/HookPhase";
import { BranchStartedEvent } from "#gitwe/domain/events/BranchStartedEvent";
import type { Logger } from "#gitwe/shared/logging/Logger";
import { BranchService } from "#gitwe/application/services/BranchService";
import { HookService } from "#gitwe/application/services/HookService";
import { StartBranchCommand } from "#gitwe/application/commands/StartBranchCommand";
import { StartBranchResult } from "#gitwe/application/dto/StartBranchResult";

/**
 * Use case: start a new branch of a given type. Each step is delegated to
 * a focused service — this handler's only job is sequencing them and
 * translating the outcome into a DTO.
 */
export class StartBranchHandler {
  constructor(
    private readonly workflow: Workflow,
    private readonly branchService: BranchService,
    private readonly hookService: HookService,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
  ) {}

  async handle(command: StartBranchCommand): Promise<StartBranchResult> {
    const rule = this.branchService.resolveBranchType(this.workflow, command.branchType);

    await this.hookService.run(HookPhase.PreStart, this.workflow.hooks);
    const branchName = await this.branchService.create(this.workflow, rule, command.shortName);
    await this.hookService.run(HookPhase.PostStart, this.workflow.hooks);

    await this.eventBus.publish(new BranchStartedEvent(branchName, rule.name, rule.baseBranch));
    this.logger.info(`Started branch ${branchName} from ${rule.baseBranch}`);

    return { branchName, baseBranch: rule.baseBranch };
  }
}
