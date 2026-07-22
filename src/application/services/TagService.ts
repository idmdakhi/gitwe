import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import { BranchTypeRule } from "#gitwe/domain/valueObjects/BranchTypeRule";
import { AutoTagPolicy } from "#gitwe/domain/policies/AutoTagPolicy";

/** Orchestrates creating a version tag for a finished branch, when the branch type configures one. */
export class TagService {
  constructor(private readonly git: GitRepository) {}

  async tagIfConfigured(branchName: string, rule: BranchTypeRule): Promise<string | undefined> {
    const tagName = AutoTagPolicy.tagNameFor(rule, branchName);
    if (!tagName) return undefined;

    await this.git.createTag(tagName, `Release ${tagName}`);
    return tagName;
  }
}

