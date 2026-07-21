export class ExecutionEngine {
  constructor(private readonly logger: ExecutionLogger) {}

  async execute(
    pipeline: Pipeline,

    context: PipelineContext,

    options: ExecutionOptions,
  ): Promise<ExecutionResult> {
    const started = Date.now();

    const execution = new ExecutionContext();

    for (const step of pipeline.steps) {
      execution.currentStep = step.constructor.name;

      if (options.verbose) {
        this.logger.info(execution.currentStep);
      }

      await step.execute(context);
    }

    return {
      state: ExecutionState.Success,

      duration: Date.now() - started,

      steps: pipeline.steps.length,

      errors: execution.errors,
    };
  }
}
