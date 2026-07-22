export class PipelineCompiler {
  constructor(private readonly registry: StepRegistry) {}

  compile(definition: PipelineDefinition) {
    const steps = definition.steps.map((step) =>
      this.registry

        .resolve(step.type)

        .create(step.options),
    );

    return new Pipeline(steps);
  }
}

