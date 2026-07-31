import type { Workflow } from "#gitwe/domain/aggregates/Workflow";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { EventBus } from "#gitwe/domain/ports/EventBus";
import type { StateStore } from "#gitwe/domain/ports/StateStore";
import type { Logger } from "#gitwe/shared/logging/logger";
import { PipelineState } from "#gitwe/kernel/pipeline/PipelineState";

/**
 * Stages of a transition pipeline.
 * Each stage represents a phase in the lifecycle of a transition.
 */
export enum PipelineStage {
  /** Pre-execution validation (rules, policies, preconditions) */
  VALIDATE = "validate",
  /** Core operation execution (merge, rebase, delete, create) */
  TRANSITION = "transition",
  /** Post-execution side effects (versioning, tagging, changelog) */
  POST_TRANSITION = "post_transition",
  /** Finalization (push, notifications, audit, events) */
  FINALIZE = "finalize",
}

/**
 * Context passed through the pipeline.
 * Carries all data needed by capabilities and accumulates results.
 */
export interface PipelineContext<TInput = unknown, TOutput = unknown> {
  /** Input to the transition */
  readonly input: TInput;
  /** Output of the transition (to be filled by capabilities) */
  output: TOutput | undefined;
  /** Shared metadata between capabilities */
  readonly metadata: Map<string, unknown>;
  /** Results from each stage */
  readonly stageResults: Map<PipelineStage, unknown>;
  /** Current stage being executed */
  currentStage: PipelineStage | undefined;
  /** Workflow instance */
  readonly workflow: Workflow;
  /** Git repository adapter */
  readonly git: GitRepository;
  /** Event bus for publishing domain events */
  readonly eventBus: EventBus;
  /** State store for workflow state persistence */
  readonly stateStore: StateStore;
  /** Logger for structured logging */
  readonly logger: Logger;
  /** Whether this is a dry run */
  readonly dryRun: boolean;
  /** Whether the pipeline has failed */
  failed: boolean;
  /** Error if the pipeline failed */
  error?: Error;
}

/**
 * Result of a pipeline execution.
 */
export interface PipelineResult<TOutput = unknown> {
  output: TOutput;
  metadata: Map<string, unknown>;
  stageResults: Map<PipelineStage, unknown>;
  duration: number;
  success: boolean;
  error?: Error;
}

export interface PipelineContext<TInput = unknown, TOutput = unknown> {
  readonly input: TInput;
  output: TOutput | undefined;
  readonly metadata: Map<string, unknown>;
  readonly stageResults: Map<PipelineStage, unknown>;
  currentStage: PipelineStage | undefined;
  readonly workflow: Workflow;
  readonly git: GitRepository;
  readonly eventBus: EventBus;
  readonly stateStore: StateStore;
  readonly logger: Logger;
  readonly dryRun: boolean;
  failed: boolean;
  error?: Error;
  // جدید:
  state?: PipelineState;
}
