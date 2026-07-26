import type { KernelModule } from "#gitwe/kernel/KernelModule";
import type { StartBranchHandler } from "#gitwe/application/handlers/StartBranchHandler";
import type { StartBranchCommand } from "#gitwe/application/commands/StartBranchCommand";
import type { StartBranchResult } from "#gitwe/application/dto/StartBranchResult";

export class StartModule implements KernelModule<StartBranchCommand, StartBranchResult> {
  readonly name = "start";
  readonly description = "Start a new branch of a given type (e.g. feature, release, hotfix).";

  constructor(private readonly handler: StartBranchHandler) {}

  execute(input: StartBranchCommand): Promise<StartBranchResult> {
    return this.handler.handle(input);
  }
}
