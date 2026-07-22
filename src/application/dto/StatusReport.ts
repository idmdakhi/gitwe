export interface BranchSummaryDto {
  readonly name: string;
  readonly isCurrent: boolean;
}

export interface BranchTreeNode {
  readonly name: string;
  readonly isCurrent: boolean;
  readonly children: BranchTreeNode[];
}

export interface StatusReport {
  readonly currentBranch: string;
  readonly totalBranches: number;
  readonly branchTypes: string[];
  readonly tree: BranchTreeNode;
}

