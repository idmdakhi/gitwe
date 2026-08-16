import type { ResolvedBranch } from "../../domain/entities/branch-type.entity.js";
import type { WorkflowService } from "../../domain/services/workflow.service.js";
import type { GitRepository } from "../../domain/ports/git-repository.port.js";

export interface ListBranchesInput {
  readonly typeNameOrAlias?: string;
  readonly pattern?: string;
}

export class ListBranchesUseCase {
  constructor(private readonly workflow: WorkflowService, private readonly git: GitRepository) {}

  async execute(input: ListBranchesInput = {}): Promise<readonly ResolvedBranch[]> {
    const type = input.typeNameOrAlias ? this.workflow.requireBranchType(input.typeNameOrAlias) : undefined;
    const glob = type ? `${type.prefix}${input.pattern ?? "*"}` : (input.pattern ?? "*");

    const branches = await this.git.listBranches(glob);
    return branches
      .map((b) => this.workflow.resolveBranch(b))
      .filter((b): b is ResolvedBranch => b !== undefined);
  }
}
