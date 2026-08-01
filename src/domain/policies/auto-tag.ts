import { BranchTypeRule } from "#gitwe/domain/valueObjects/branch-type-rule";

/**
 * Computes the tag name to create when finishing a branch, based on its
 * type's {@link AutoTagConfig}.
 *
 * @public
 */
export class AutoTagPolicy {
  /**
   * @param rule - The branch type rule governing the branch being finished.
   * @param fullBranchName - The full branch name being finished, e.g. `"release/1.2.0"`.
   * @returns The tag name to create, or `undefined` if auto-tagging is disabled for this branch type.
   */
  static tagNameFor(rule: BranchTypeRule, fullBranchName: string): string | undefined {
    if (!rule.autoTag.enabled) return undefined;
    const prefix = rule.autoTag.prefix ?? "v";
    return `${prefix}${rule.shortNameOf(fullBranchName)}`;
  }
}
