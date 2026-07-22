export class DeleteBranchStep implements Step {
  async execute(context: PipelineContext) {
    await context.git.deleteBranch(context.branch.fullName);

    context.deleted = true;
  }
}

