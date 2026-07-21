export class Pipeline {
  constructor(private readonly steps: Step[]) {}

  async run(context: PipelineContext) {
    for (const step of this.steps) {
      await step.execute(context);
    }
  }
}
