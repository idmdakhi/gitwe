export class CheckoutOperation implements Operation {
  async execute(ctx: OperationContext) {
    await ctx.git.checkout(ctx.target);
  }
}
