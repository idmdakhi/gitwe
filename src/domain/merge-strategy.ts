/**
 * Merge / finish strategies (RFC-0002).
 *
 * Existing: merge | squash | rebase
 * New:     cherry-pick | rebase-merge
 */

/** How a topic branch is integrated into its parent branch. */

export type MergeStrategy = "merge" | "squash" | "rebase" | "cherry-pick" | "rebase-merge";

/** How a branch is brought up to date with its parent branch. */
export type UpdateStrategy = "merge" | "rebase";

export const ALL_MERGE_STRATEGIES: readonly MergeStrategy[] = [
  "merge",
  "squash",
  "rebase",
  "cherry-pick",
  "rebase-merge",
] as const;

export function isMergeStrategy(value: string): value is MergeStrategy {
  return (ALL_MERGE_STRATEGIES as readonly string[]).includes(value);
}

/**
 * Human description for docs / doctor / dry-run.
 */
export function describeStrategy(strategy: MergeStrategy): string {
  switch (strategy) {
    case "merge":
      return "Create a merge commit on the target";
    case "squash":
      return "Squash all commits into one commit on the target";
    case "rebase":
      return "Rebase the topic onto the target, then fast-forward";
    case "cherry-pick":
      return "Cherry-pick each commit from the topic onto the target";
    case "rebase-merge":
      return "Rebase the topic onto the target, then create a merge commit";
    default:
      return strategy;
  }
}

/**
 * Whether the strategy may produce conflicts that require --continue / --abort.
 */
export function strategyCanConflict(strategy: MergeStrategy): boolean {
  // All current strategies can conflict
  return true;
}
