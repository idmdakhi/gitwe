import { Step } from "#gitwe/pipeline/Step";
import { PipelineContext } from "#gitwe/pipeline/PipelineContext";
export class MergeStep implements Step {
  constructor(private readonly target: string) {}

  async execute(context: PipelineContext) {
    await context.git.merge(context.branch.fullName, this.target);

    context.merged = true;
  }
}
