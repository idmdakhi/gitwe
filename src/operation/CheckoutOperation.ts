import { Operation } from "#gitwe/operation/Operation";
import { OperationContext } from "#gitwe/operation/OperationContext";

export class CheckoutOperation implements Operation {
  async execute(ctx: OperationContext) {
    if (!ctx.target) throw new Error("target is required for checkout");

    await ctx.git.checkout(ctx.target);
  }
}
