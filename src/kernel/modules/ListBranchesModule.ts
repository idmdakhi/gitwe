import type { KernelModule } from "#gitwe/kernel/KernelModule";
import type { ListBranchesHandler } from "#gitwe/application/handlers/ListBranchesHandler";
import type { BranchSummaryDto } from "#gitwe/application/dto/StatusReport";

export class ListBranchesModule implements KernelModule<void, BranchSummaryDto[]> {
  readonly name = "list";
  readonly description = "List all local branches, flagging which one is currently checked out.";

  constructor(private readonly handler: ListBranchesHandler) {}

  execute(): Promise<BranchSummaryDto[]> {
    return this.handler.handle();
  }
}
