import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { MergeRequest } from "#gitwe/merge/MergeRequest";
import { IFMergeStrategy } from "#gitwe/merge/MergeStrategy";

export class SquashMergeStrategy implements IFMergeStrategy {
  async execute(git: GitRepository, request: MergeRequest) {
    // پیاده‌سازی merge معمولی
    await git.checkout(request.target);
    await git.merge(request.source, request.target);
  }
}
