import type { MergeRequest } from "./MergeRequest";

export class MergeValidator {
  validate(request: MergeRequest) {
    if (!request.source) {
      throw new Error("Source branch is required.");
    }

    if (!request.target) {
      throw new Error("Target branch is required.");
    }

    if (request.source === request.target) {
      throw new Error("Source and target cannot be the same.");
    }
  }
}

