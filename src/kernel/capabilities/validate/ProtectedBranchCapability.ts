import type { PipelineContext } from "#gitwe/kernel/pipeline/Stage";
import type { Capability } from "#gitwe/kernel/capabilities/Capability";

import { ProtectedBranchError } from "#gitwe/domain/errors";

export class ProtectedBranchCapability implements Capability<any, any> {
  readonly name = "validate.protected-branch";
  readonly description = "Prevent operations on protected branches";

  async execute(input: any, context: PipelineContext<any, any>): Promise<any> {
    const branchName = input.branchName;
    if (!branchName) return context.output;
    if (context.workflow.isProtected(branchName)) {
      throw new ProtectedBranchError(branchName, context.currentStage || "operation");
    }
    return context.output;
  }
}
