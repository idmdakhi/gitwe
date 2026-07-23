import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { MergeRequest } from "#gitwe/merge/MergeRequest";
import { IFMergeStrategy } from "#gitwe/merge/MergeStrategy";

export class SquashMergeStrategy implements IFMergeStrategy {
  async execute(git: GitRepository, request: MergeRequest) {
    await git.checkout(request.target);
    await git.runRaw(["merge", "--squash", request.source]);
    await git.runRaw(["commit", "-m", `Squash merge ${request.source} into ${request.target}`]);
  }
}
