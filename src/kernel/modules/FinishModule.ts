import type { KernelModule } from "#gitwe/kernel/KernelModule";
import type { FinishBranchHandler } from "#gitwe/application/handlers/FinishBranchHandler";
import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";

export class FinishModule implements KernelModule<FinishBranchCommand, FinishBranchResult> {
  readonly name = "finish";
  readonly description = "Merge a branch into its configured targets, tag it, and delete it.";

  constructor(private readonly handler: FinishBranchHandler) {}

  execute(input: FinishBranchCommand): Promise<FinishBranchResult> {
    return this.handler.handle(input);
  }
}
