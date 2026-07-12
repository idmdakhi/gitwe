import type { ExecutionId } from "./execution-id";

import type { ExecutionMetadata } from "./execution-metadata";

import { CancellationToken } from "./cancellation-token";

import { ExecutionPriority } from "./execution-priority";

import { ExecutionState } from "./execution-state";

export class ExecutionContext {
  public state = ExecutionState.CREATED;

  public readonly cancellation = new CancellationToken();

  public constructor(
    public readonly id: ExecutionId,

    public readonly metadata: ExecutionMetadata,

    public readonly priority = ExecutionPriority.NORMAL,
  ) {}

  public start(): void {
    this.state = ExecutionState.RUNNING;
  }

  public complete(): void {
    this.state = ExecutionState.COMPLETED;
  }

  public fail(): void {
    this.state = ExecutionState.FAILED;
  }

  public cancel(): void {
    this.cancellation.cancel();

    this.state = ExecutionState.CANCELLED;
  }
}
