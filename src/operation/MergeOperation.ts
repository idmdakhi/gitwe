export class MergeOperation implements Operation {
  async execute(ctx: OperationContext) {
    await ctx.git.merge({
      source: ctx.source,

      target: ctx.target,
    });
  }
}
