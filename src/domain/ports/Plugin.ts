import type { PluginContext } from "#gitwe/domain/plugins/PluginContext";
import type { Rule } from "#gitwe/domain/rules/Rule";

/**
 * Optional lifecycle hooks a plugin can implement. Mirrors HookPhase but
 * for programmatic (not shell) extension. All hooks are optional and
 * fire in registration order; a plugin that throws aborts the operation
 * (same failure semantics as a failed shell hook).
 */
export interface Plugin {
  readonly name: string;
  onPreStart?(ctx: PluginContext, branchType: string, shortName: string): Promise<void> | void;
  onPostStart?(ctx: PluginContext, branchName: string): Promise<void> | void;
  onPreFinish?(ctx: PluginContext, branchName: string): Promise<void> | void;
  onPostFinish?(ctx: PluginContext, branchName: string): Promise<void> | void;
  /** Lets a plugin contribute extra validation rules into RuleEvaluator, e.g. enterprise's "requireApprovals". */
  contributeRules?(): Rule[];
}

/** Port for discovering/loading plugins — separate from the Plugin interface itself so loading strategy (npm package, local file, remote registry) is swappable. */
export interface PluginLoader {
  load(): Promise<Plugin[]>;
}
