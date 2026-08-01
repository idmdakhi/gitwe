/**
 * How two branches are combined.
 * - `"merge"`: a regular merge commit (optionally `--no-ff`).
 * - `"squash"`: all commits condensed into a single commit.
 * - `"rebase"`: replay commits on top of the target, then fast-forward.
 *
 * @public
 */
export type MergeStrategy = "merge" | "squash" | "rebase";

/** How a branch catches up with its parent — a strict subset of {@link MergeStrategy} (no squash). @public */
export type UpdateStrategy = "merge" | "rebase";
