import type { NodeId } from "../graph";

import type { TaskState } from "./task-state";

export interface Task {
  readonly node: NodeId;

  readonly dependencies: readonly NodeId[];

  readonly priority: number;

  readonly state: TaskState;
}
