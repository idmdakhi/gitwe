import type { Executor } from "../executor";

export interface PluginContext {
  registerExecutor(
    type: string,

    executor: Executor,
  ): void;
}
