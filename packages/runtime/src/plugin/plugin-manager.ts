import type { Plugin } from "./plugin";
import type { PluginContext } from "./plugin-context";

export class PluginManager implements PluginContext {
  private readonly plugins = new Map<string, Plugin>();

  private readonly executors = new Map<string, any>();

  public async install(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      return;
    }

    await plugin.install(this);

    this.plugins.set(plugin.id, plugin);
  }

  public registerExecutor(
    type: string,

    executor: any,
  ): void {
    this.executors.set(
      type,

      executor,
    );
  }

  public executor(type: string) {
    return this.executors.get(type);
  }
}
