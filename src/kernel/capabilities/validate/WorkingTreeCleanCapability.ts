import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";

export class WorkingTreeCleanCapability implements Capability<any, boolean> {
  readonly name = "validate.working-tree-clean";
  readonly description = "Check that the working tree is clean";

  async execute(_input: any, context: PipelineContext<any, any>): Promise<boolean> {
    const clean = await context.git.isWorkingTreeClean();
    if (!clean) {
      throw new Error("Working tree has uncommitted changes. Commit or stash them first.");
    }
    return true;
  }
}
