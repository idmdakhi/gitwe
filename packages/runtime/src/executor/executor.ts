import type { Task } from "../scheduler";

export interface Executor {
  execute(task: Task): Promise<void>;
}
