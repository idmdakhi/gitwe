export interface MergeRequest {
  source: string;

  target: string;

  strategy: "merge" | "squash" | "rebase";

  deleteSource: boolean;

  createTag: boolean;

  tagName?: string;
}
