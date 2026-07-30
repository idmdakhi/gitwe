// src/kernel/pipeline/TransitionRuntime.ts
import type { Capability, ConditionalCapability } from "#gitwe/kernel/capabilities/Capability";
import { PipelineContext, PipelineResult, PipelineStage } from "#gitwe/kernel/pipeline/Stage";
import type { PolicyEngine } from "#gitwe/kernel/policy/PolicyEngine";
import { PipelineState } from "#gitwe/kernel/pipeline/PipelineState";

export interface TransitionRuntimeOptions {
  failFast?: boolean;
  continueOnFailure?: boolean;
}

export class TransitionRuntime {
  private readonly capabilities = new Map<PipelineStage, Capability<any, any>[]>();
  private policyEngine?: PolicyEngine;
  private options: TransitionRuntimeOptions = {
    failFast: true,
    continueOnFailure: false,
  };

  constructor(options: TransitionRuntimeOptions = {}) {
    this.options = { ...this.options, ...options };
  }

  register<TInput, TOutput>(capability: Capability<TInput, TOutput>, stage: PipelineStage): this {
    if (!this.capabilities.has(stage)) {
      this.capabilities.set(stage, []);
    }
    this.capabilities.get(stage)!.push(capability);
    return this;
  }

  setPolicyEngine(engine: PolicyEngine): this {
    this.policyEngine = engine;
    return this;
  }

  async run<TInput, TOutput>(
    stages: PipelineStage[],
    context: PipelineContext<TInput, TOutput>,
  ): Promise<PipelineResult<TOutput>> {
    const startTime = Date.now();
    context.logger.debug(`[Pipeline] Starting with ${stages.length} stages`);

    // مقداردهی اولیه state اگر وجود نداشت
    if (!context.state) {
      context.state = new PipelineState();
    }

    try {
      for (const stage of stages) {
        context.currentStage = stage;
        const caps = this.capabilities.get(stage) ?? [];

        if (caps.length === 0) {
          context.logger.debug(`[Pipeline] No capabilities for stage: ${stage}`);
          continue;
        }

        context.logger.debug(`[Pipeline] Running stage: ${stage} (${caps.length} capabilities)`);

        const filteredCaps = await this.filterCapabilities(caps, context);

        if (filteredCaps.length === 0) {
          context.logger.debug(`[Pipeline] All capabilities filtered for stage: ${stage}`);
          continue;
        }

        for (const capability of filteredCaps) {
          const capStartTime = Date.now();

          try {
            const result = await capability.execute(context.input, context);
            // ذخیره نتیجه در state بر اساس نام capability
            context.state!.set(capability.name, result);
            context.stageResults.set(stage, result);
            context.logger.debug(
              `[Pipeline] ${capability.name} completed in ${Date.now() - capStartTime}ms`,
            );
          } catch (error) {
            context.error = error as Error;
            context.failed = true;
            context.logger.error(
              `[Pipeline] ${capability.name} failed in stage ${stage}: ${error}`,
            );

            if (this.options.failFast) {
              throw error;
            }

            if (!this.options.continueOnFailure) {
              break;
            }
          }
        }

        if (context.failed && !this.options.continueOnFailure) {
          break;
        }
      }
    } catch (error) {
      context.failed = true;
      context.error = error as Error;
      throw error;
    }

    return {
      output: context.output as TOutput,
      metadata: context.metadata,
      stageResults: context.stageResults,
      duration: Date.now() - startTime,
      success: !context.failed,
      error: context.error,
    };
  }

  private async filterCapabilities<TInput, TOutput>(
    capabilities: Capability<TInput, TOutput>[],
    context: PipelineContext<TInput, TOutput>,
  ): Promise<Capability<TInput, TOutput>[]> {
    const result: Capability<TInput, TOutput>[] = [];

    for (const capability of capabilities) {
      if (this.isConditionalCapability(capability)) {
        if (!capability.isEnabled(context.input, context)) {
          context.logger.debug(`[Pipeline] ${capability.name} disabled by condition`);
          continue;
        }
      }

      if (this.policyEngine) {
        if (!this.policyEngine.isCapabilityEnabled(capability, context)) {
          context.logger.debug(`[Pipeline] ${capability.name} disabled by policy`);
          continue;
        }
      }

      result.push(capability);
    }

    return result;
  }

  private isConditionalCapability<TInput, TOutput>(
    cap: Capability<TInput, TOutput>,
  ): cap is ConditionalCapability<TInput, TOutput> {
    return typeof (cap as ConditionalCapability<TInput, TOutput>).isEnabled === "function";
  }

  list(): Array<{ stage: PipelineStage; capabilities: string[] }> {
    const result: Array<{ stage: PipelineStage; capabilities: string[] }> = [];
    for (const [stage, caps] of this.capabilities) {
      result.push({
        stage,
        capabilities: caps.map((c) => c.name),
      });
    }
    return result;
  }
}
