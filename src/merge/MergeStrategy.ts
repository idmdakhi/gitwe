import type { GitRepository } from "../git";

import type { MergeRequest } from "./MergeRequest";

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

    await git.merge({
      source: request.source,

      target: request.target,
    });
  }
}
export class SquashMergeStrategy implements IFMergeStrategy {
  async execute(git: GitRepository, request: MergeRequest) {
    /*
           git merge --squash
        */
  }
}
export class RebaseMergeStrategy implements MergeStrategy {
  async execute(git: GitRepository, request: MergeRequest) {
    /*
            git rebase
        */
  }
}

