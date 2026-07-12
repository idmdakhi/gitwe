import type { NodeId } from "../graph";

import type { ExecutionStepStatus } from "./execution-step-status";

export interface ExecutionStep {
  readonly id: NodeId;

  readonly dependencies: readonly NodeId[];

  readonly dependents: readonly NodeId[];

  readonly level: number;

  readonly parallelGroup: number;

  readonly status: ExecutionStepStatus;
}
