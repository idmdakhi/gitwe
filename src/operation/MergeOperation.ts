import { Operation } from "#gitwe/operation/Operation";
import { OperationContext } from "#gitwe/operation/OperationContext";
export class MergeOperation implements Operation {
  async execute(ctx: OperationContext) {
    if (!ctx.source || !ctx.target) throw new Error("source and target required");

    await ctx.git.merge(ctx.source, ctx.target);
  }
}
