/** Metadata for a single git commit. @public */
export interface CommitInfo {
  readonly hash: string;
  readonly date: Date;
  readonly author: string;
  readonly message: string;
}

/** Result of merging one branch into another. @public */
export interface MergeOutcome {
  readonly source: string;
  readonly target: string;
  /** Whether the merge was a fast-forward (no merge commit created). */
  readonly fastForward: boolean;
}

/** How far a local branch has diverged from its remote-tracking counterpart. @public */
export interface AheadBehind {
  /** Commits on the local branch not yet on the remote. */
  readonly ahead: number;
  /** Commits on the remote not yet on the local branch. */
  readonly behind: number;
}
