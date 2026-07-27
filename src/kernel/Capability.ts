import type { Workflow } from "#gitwe/domain/aggregates/Workflow";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { EventBus } from "#gitwe/domain/ports/EventBus";
import type { StateStore } from "#gitwe/domain/ports/StateStore";
import type { Logger } from "#gitwe/shared/logging/Logger";

/**
 * Context passed to every capability execution.
 * This is a subset of the Container — exactly what a capability needs,
 * and nothing more. Capabilities never import `Container` directly.
 */
export interface WorkflowContext {
  readonly workflow: Workflow;
  readonly git: GitRepository;
  readonly eventBus: EventBus;
  readonly stateStore: StateStore;
  readonly logger: Logger;
  /** Arbitrary data passed between capabilities in a pipeline. */
  readonly metadata: Map<string, unknown>;
}

/**
 * A single, focused, composable capability that the kernel can dispatch.
 * Capabilities are the "atoms" of workflow execution — they do one thing
 * and do it well, and they can be chained together by modules.
 */
export interface Capability<TInput = void, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  execute(input: TInput, context: WorkflowContext): Promise<TOutput>;
}

/**
 * A capability that can be enabled/disabled based on workflow policy.
 * This allows feature flags like "versioning.enabled" in config.
 */
export interface PolicyDrivenCapability<TInput, TOutput> extends Capability<TInput, TOutput> {
  isEnabled(context: WorkflowContext): boolean;
}
