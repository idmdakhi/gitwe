import type { GitRepository } from "#gitwe/domain/ports/GitRepository";

import { MergeExecutor } from "#gitwe/merge/MergeExecutor";
import { MergeValidator } from "#gitwe/merge/MergeValidator";

import type { MergeRequest } from "#gitwe/merge/MergeRequest";
import type { MergeResult } from "#gitwe/merge/MergeResult";

export class MergeService {
  constructor(private readonly git: GitRepository) {}

  async merge(request: MergeRequest): Promise<MergeResult> {
    new MergeValidator().validate(request);

    const executor = new MergeExecutor();

    await executor

      .strategy(request.strategy)

      .execute(
        this.git,

        request,
      );

    if (request.createTag && request.tagName) {
      await this.git.createTag(request.tagName);
    }

    if (request.deleteSource) {
      await this.git.deleteBranch(request.source);
    }

    return {
      merged: true,

      source: request.source,

      target: request.target,

      deleted: request.deleteSource,

      tag: request.tagName,
    };
  }
}
