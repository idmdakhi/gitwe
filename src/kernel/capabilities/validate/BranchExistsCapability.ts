import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";

import { BranchNotFoundError } from "#gitwe/domain/errors";

export class BranchExistsCapability implements Capability<any, any> {
  readonly name = "validate.branch-exists";
  readonly description = "Ensure the target branch exists";

  async execute(input: any, context: PipelineContext<any, any>): Promise<any> {
    const branchName = input.branchName;
    if (!branchName) return context.output; // اگر ورودی شامل branchName نباشد، رد می‌شویم
    const exists = await context.git.branchExists(branchName);
    if (!exists) {
      throw new BranchNotFoundError(branchName);
    }
    return context.output;
  }
}
