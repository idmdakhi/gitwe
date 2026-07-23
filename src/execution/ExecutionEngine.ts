import { ExecutionLogger } from "#gitwe/execution/ExecutionLogger";
import { Pipeline } from "#gitwe/pipeline/Pipeline";
import { PipelineContext } from "#gitwe/pipeline/PipelineContext";
import { ExecutionOptions } from "#gitwe/execution/ExecutionOptions";
import { ExecutionContext } from "#gitwe/execution/ExecutionContext";
import { ExecutionResult } from "#gitwe/execution/ExecutionResult";
import { ExecutionState } from "#gitwe/execution/ExecutionState";
export class ExecutionEngine {
  constructor(private readonly logger: ExecutionLogger) {}

  async execute(
    pipeline: Pipeline,

    context: PipelineContext,

    options: ExecutionOptions,
  ): Promise<ExecutionResult> {
    const started = Date.now();

    const execution = new ExecutionContext();

    for (const step of pipeline.getSteps()) {
      execution.currentStep = step.constructor.name;

      if (options.verbose) {
        this.logger.info(execution.currentStep);
      }

      await step.execute(context);
    }

    return {
      state: ExecutionState.Success,

      duration: Date.now() - started,

      steps: pipeline.getSteps().length,

      errors: execution.errors,
    };
  }
}
