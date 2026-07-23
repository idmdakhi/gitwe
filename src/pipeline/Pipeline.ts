import { Step } from "#gitwe/pipeline/Step";
import { PipelineContext } from "#gitwe/pipeline/PipelineContext";
export class Pipeline {
  constructor(private readonly steps: Step[]) {}

  async run(context: PipelineContext) {
    for (const step of this.steps) {
      await step.execute(context);
    }
  }
  getSteps(): Step[] {
    return this.steps;
  }
}
