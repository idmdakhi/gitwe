import { StepRegistry } from "#gitwe/pipeline/registry/StepRegistry";
import { PipelineDefinition } from "#gitwe/pipeline/definition/PipelineDefinition";
import { Pipeline } from "#gitwe/pipeline/Pipeline";
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
