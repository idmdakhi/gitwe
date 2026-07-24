import type { Plugin } from "#gitwe/domain/ports/Plugin";
import type { PluginContext } from "#gitwe/domain/plugins/PluginContext";

export class PluginService {
  constructor(private readonly plugins: readonly Plugin[]) {}

  async runPreStart(ctx: PluginContext, branchType: string, shortName: string): Promise<void> {
    for (const p of this.plugins) await p.onPreStart?.(ctx, branchType, shortName);
  }
  async runPostStart(ctx: PluginContext, branchName: string): Promise<void> {
    for (const p of this.plugins) await p.onPostStart?.(ctx, branchName);
  }
  async runPreFinish(ctx: PluginContext, branchName: string): Promise<void> {
    for (const p of this.plugins) await p.onPreFinish?.(ctx, branchName);
  }
  async runPostFinish(ctx: PluginContext, branchName: string): Promise<void> {
    for (const p of this.plugins) await p.onPostFinish?.(ctx, branchName);
  }
  collectRules() {
    return this.plugins.flatMap((p) => p.contributeRules?.() ?? []);
  }
}
