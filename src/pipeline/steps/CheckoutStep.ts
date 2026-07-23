import { Step } from "#gitwe/pipeline/Step";
import { PipelineContext } from "#gitwe/pipeline/PipelineContext";
export class CheckoutStep implements Step {
  constructor(private readonly target: string) {}

  async execute(context: PipelineContext) {
    await context.git.checkout(this.target);
  }
}
