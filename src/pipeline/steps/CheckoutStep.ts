export class CheckoutStep implements Step {
  constructor(private readonly target: string) {}

  async execute(context: PipelineContext) {
    await context.git.checkout(this.target);
  }
}

