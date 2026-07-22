import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import { BranchSummaryDto } from "../dto/StatusReport";

export class ListBranchesHandler {
  constructor(private readonly git: GitRepository) {}

  async handle(): Promise<BranchSummaryDto[]> {
    const branches = await this.git.listBranches();
    return branches.map((b) => ({ name: b.name, isCurrent: b.isCurrent }));
  }
}
