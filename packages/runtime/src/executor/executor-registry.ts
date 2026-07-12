import type { Executor } from "./executor";

export class ExecutorRegistry {
  private readonly executors = new Map<string, Executor>();

  public register(
    type: string,

    executor: Executor,
  ): void {
    this.executors.set(
      type,

      executor,
    );
  }

  public resolve(type: string): Executor {
    const executor = this.executors.get(type);

    if (!executor) {
      throw new Error(`${type} executor not found.`);
    }

    return executor;
  }
}
