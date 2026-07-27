import { PipelineContext } from "#gitwe/kernel/pipeline/Stage";

/**
 * A single, focused operation that can be plugged into a pipeline stage.
 */
export interface Capability<TInput = unknown, TOutput = unknown> {
  /** Unique name */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Execute the capability */
  execute(input: TInput, context: PipelineContext<TInput, any>): Promise<TOutput>;
}

/**
 * A capability that can be conditionally enabled based on context.
 */
export interface ConditionalCapability<TInput, TOutput> extends Capability<TInput, TOutput> {
  /** Returns true if this capability should be executed */
  isEnabled(input: TInput, context: PipelineContext<TInput, any>): boolean;
}

/**
 * A capability that can be configured via policy.
 */
export interface ConfigurableCapability<TInput, TOutput> extends Capability<TInput, TOutput> {
  /** Configure the capability with policy settings */
  configure(config: Record<string, unknown>): void;
}
