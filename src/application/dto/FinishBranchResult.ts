export interface MergeResultDto {
  readonly source: string;
  readonly target: string;
  readonly fastForward: boolean;
}

export interface FinishBranchResult {
  readonly merges: MergeResultDto[];
  readonly tags: string[];
  readonly deleted: boolean;
  /** True if this result describes a plan (from `--dry-run`) rather than something actually executed. */
  readonly dryRun: boolean;
}
