import type { Task } from "./task";

export interface Scheduler {
  schedule(tasks: readonly Task[]): readonly Task[];
}
