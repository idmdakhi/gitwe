import type { Workflow } from "#gitwe/domain/aggregates/Workflow";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { EventBus } from "#gitwe/domain/ports/EventBus";
import type { Logger } from "#gitwe/shared/logging/logger";

export interface PluginContext {
  readonly workflow: Workflow;
  readonly git: GitRepository;
  readonly eventBus: EventBus;
  readonly logger: Logger;
}
