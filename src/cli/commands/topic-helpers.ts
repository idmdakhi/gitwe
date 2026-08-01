import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { BranchTypeRule } from "#gitwe/domain/valueObjects/branch-type-rule";
import { UnrecognizedBranchError } from "#gitwe/domain/errors/index";

/**
 * Resolves the full branch name a `<type> <action> [name]` CLI command
 * should operate on: `name` (prefixed if it's a bare short name) when
 * given, otherwise the currently checked-out branch — which must belong
 * to `rule`'s type.
 *
 * @internal
 * @throws {UnrecognizedBranchError} If no `name` was given and the current branch doesn't match `rule`'s prefix.
 */
export async function resolveBranchArg(
  git: GitRepository,
  rule: BranchTypeRule,
  name: string | undefined,
): Promise<string> {
  if (name) {
    return name.startsWith(rule.prefix) ? name : `${rule.prefix}${name}`;
  }
  const current = await git.getCurrentBranch();
  if (!rule.matches(current)) {
    throw new UnrecognizedBranchError(current);
  }
  return current;
}
