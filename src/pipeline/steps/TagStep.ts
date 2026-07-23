import { Step } from "#gitwe/pipeline/Step";
import { PipelineContext } from "#gitwe/pipeline/PipelineContext";

export class TagStep implements Step {
  async execute(context: PipelineContext) {
    if (!context.config.tag.enabled) {
      return;
    }

    await context.git.createTag(`${context.config.tag.prefix}${context.branch.name}`);

    context.tagged = true;
  }
}
