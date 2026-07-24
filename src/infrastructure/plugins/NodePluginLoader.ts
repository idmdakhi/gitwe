import path from "node:path";
import type { Plugin, PluginLoader } from "#gitwe/domain/ports/Plugin";
import { PluginLoadError } from "#gitwe/domain/errors";

export class NodePluginLoader implements PluginLoader {
  constructor(
    private readonly specifiers: readonly string[],
    private readonly cwd: string,
  ) {}

  async load(): Promise<Plugin[]> {
    const plugins: Plugin[] = [];
    for (const specifier of this.specifiers) {
      try {
        const resolved = specifier.startsWith(".") ? path.resolve(this.cwd, specifier) : specifier; // npm package name — resolved by Node's own resolution
        const mod = await import(resolved);
        const plugin: Plugin = mod.default ?? mod;
        if (!plugin?.name) throw new Error("plugin module has no default export with a `name`");
        plugins.push(plugin);
      } catch (error: any) {
        throw new PluginLoadError(specifier, error.message);
      }
    }
    return plugins;
  }
}
