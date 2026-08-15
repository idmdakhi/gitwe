import type { WorkflowConfig } from "../entities/workflow-config.entity.js";

export interface ConfigRepository {
  /** Returns undefined when no workflow definition file exists. */
  load(): Promise<WorkflowConfig | undefined>;
  save(config: WorkflowConfig): Promise<void>;
  /** Absolute path the config was (or would be) loaded from/saved to. */
  readonly path: string;
}
