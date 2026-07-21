export interface MergeResult {
  merged: boolean;

  source: string;

  target: string;

  tag?: string;

  deleted: boolean;
}
