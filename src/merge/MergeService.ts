import type { GitRepository } from "../git";

import { MergeExecutor } from "./MergeExecutor";
import { MergeValidator } from "./MergeValidator";

import type { MergeRequest } from "./MergeRequest";
import type { MergeResult } from "./MergeResult";

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
      await this.git.tag({
        name: request.tagName,
      });
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

