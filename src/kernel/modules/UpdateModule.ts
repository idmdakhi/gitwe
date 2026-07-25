import type { KernelModule } from "../KernelModule";
import type { UpdateBranchHandler } from "#gitwe/application/handlers/UpdateBranchHandler";
import type { UpdateBranchCommand } from "#gitwe/application/commands/UpdateBranchCommand";
import type { UpdateBranchResult } from "#gitwe/application/dto/UpdateBranchResult";

export class UpdateModule implements KernelModule<UpdateBranchCommand, UpdateBranchResult> {
  readonly name = "update";
  readonly description = "Bring a topic branch up to date with its base branch.";

  constructor(private readonly handler: UpdateBranchHandler) {}

  execute(input: UpdateBranchCommand): Promise<UpdateBranchResult> {
    return this.handler.handle(input);
  }
}
