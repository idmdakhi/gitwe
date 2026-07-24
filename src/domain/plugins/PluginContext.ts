import type { Workflow } from "#gitwe/domain/aggregates/Workflow";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { StateStore } from "#gitwe/domain/ports/StateStore";
import type { EventBus } from "#gitwe/domain/ports/EventBus";
import type { Logger } from "#gitwe/shared/logging/Logger";

/** Everything a plugin is allowed to touch — deliberately a subset of the Container. */
export interface PluginContext {
  readonly workflow: Workflow;
  readonly git: GitRepository;
  readonly state: StateStore;
  readonly eventBus: EventBus;
  readonly logger: Logger;
}
