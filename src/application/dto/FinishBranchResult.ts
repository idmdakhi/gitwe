export interface MergeResultDto {
  readonly source: string;
  readonly target: string;
  readonly fastForward: boolean;
}

export interface FinishBranchResult {
  readonly merges: MergeResultDto[];
  readonly tags: string[];
  readonly deleted: boolean;
}
