import type { Executor } from "./executor";

import type { Task } from "../scheduler";

export class NodeExecutor implements Executor {
  public async execute(task: Task): Promise<void> {
    console.log(task.node);
  }
}
