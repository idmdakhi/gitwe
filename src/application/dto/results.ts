/** Result of {@link StartBranchHandler}. @public */
export interface StartBranchResult {
  readonly branchName: string;
  readonly baseBranch: string;
}

/** A single base branch that was auto-updated as a side effect of a finish. @public */
export interface PropagatedUpdateDto {
  readonly branchName: string;
  readonly from: string;
}

/** Result of {@link FinishBranchHandler}. @public */
export interface FinishBranchResult {
  readonly branchName: string;
  readonly mergedInto: string;
  readonly fastForward: boolean;
  readonly tag?: string;
  readonly deleted: boolean;
  /** Base branches auto-updated downstream as a result of this finish (e.g. `develop` after a `hotfix` finishes into `main`). */
  readonly propagatedTo: readonly PropagatedUpdateDto[];
  /** `true` when this is only a plan — no git operation was actually performed. */
  readonly dryRun: boolean;
}

/** Result of {@link UpdateBranchHandler}. @public */
export interface UpdateBranchResult {
  readonly branchName: string;
  readonly parent: string;
  readonly strategy: "merge" | "rebase";
  readonly fastForward?: boolean;
}

/** Result of {@link DeleteBranchHandler}. @public */
export interface DeleteBranchResult {
  readonly branchName: string;
  readonly deletedLocal: boolean;
  readonly deletedRemote: boolean;
}

/** Result of {@link PublishBranchHandler}. @public */
export interface PublishBranchResult {
  readonly branchName: string;
  readonly remote: string;
}

/** Result of {@link TrackBranchHandler}. @public */
export interface TrackBranchResult {
  readonly branchName: string;
  readonly remote: string;
}

/** Result of {@link RenameBranchHandler}. @public */
export interface RenameBranchResult {
  readonly oldName: string;
  readonly newName: string;
}

/** Result of {@link CheckoutBranchHandler}. @public */
export interface CheckoutBranchResult {
  readonly branchName: string;
  /** `true` if a new local tracking branch was created to satisfy this checkout. */
  readonly createdTrackingBranch: boolean;
}

/** Lightweight branch summary, as returned by {@link ListBranchesHandler}. @public */
export interface BranchSummaryDto {
  readonly name: string;
  readonly type?: string;
  readonly isCurrent: boolean;
  readonly hasUpstream: boolean;
}

/** Repository-wide status, as returned by {@link GetStatusHandler}. @public */
export interface StatusReport {
  readonly currentBranch: string;
  readonly workflowName: string;
  readonly baseBranches: readonly string[];
  readonly branchTypes: readonly string[];
  readonly topicBranches: readonly BranchSummaryDto[];
}

/** Result of {@link InitWorkflowHandler}. @public */
export interface InitWorkflowResult {
  readonly workflowName: string;
  readonly createdBaseBranches: readonly string[];
}
