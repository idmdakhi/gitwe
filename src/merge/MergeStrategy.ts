import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { MergeRequest } from "#gitwe/merge/MergeRequest";

export interface IFMergeStrategy {
  execute(
    git: GitRepository,

    request: MergeRequest,
  ): Promise<void>;
}

export class MergeStrategy implements IFMergeStrategy {
  async execute(
    git: GitRepository,

    request: MergeRequest,
  ) {
    await git.checkout(request.target);

    await git.merge(
      request.source,

      request.target,
    );
  }
}
