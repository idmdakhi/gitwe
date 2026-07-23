import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { MergeRequest } from "#gitwe/merge/MergeRequest";
import { IFMergeStrategy } from "#gitwe/merge/MergeStrategy";

export class RebaseMergeStrategy implements IFMergeStrategy {
  async execute(git: GitRepository, request: MergeRequest) {
    await git.checkout(request.source);
    await git.runRaw(["rebase", request.target]);
    await git.checkout(request.target);
    await git.runRaw(["merge", "--ff-only", request.source]);
  }
}
