export class MergeStep implements Step {
  constructor(private readonly target: string) {}

  async execute(context: PipelineContext) {
    await context.git.merge({
      source: context.branch.fullName,

      target: this.target,
    });

    context.merged = true;
  }
}
