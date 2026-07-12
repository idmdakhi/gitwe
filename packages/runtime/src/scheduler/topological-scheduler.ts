import { TaskState } from "./task-state";

import type { Scheduler } from "./scheduler";

import type { Task } from "./task";

export class TopologicalScheduler implements Scheduler {
  public schedule(tasks: readonly Task[]): readonly Task[] {
    const completed = new Set<string>();

    const ready: Task[] = [];

    for (const task of tasks) {
      const satisfied = task.dependencies.every((dependency) =>
        completed.has(dependency),
      );

      if (satisfied) {
        ready.push({
          ...task,

          state: TaskState.READY,
        });
      }
    }

    ready.sort((a, b) => b.priority - a.priority);

    return ready;
  }
}
