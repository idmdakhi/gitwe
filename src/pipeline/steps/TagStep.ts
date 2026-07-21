export class TagStep implements Step {
  async execute(context: PipelineContext) {
    if (!context.config.tag.enabled) {
      return;
    }

    await context.git.tag({
      name: context.config.tag.prefix + context.branch.name,
    });

    context.tagged = true;
  }
}
