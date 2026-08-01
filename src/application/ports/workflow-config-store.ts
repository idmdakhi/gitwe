import type { Workflow } from "#gitwe/domain/aggregates/workflow";

/**
 * Port for loading and persisting the repository's active
 * {@link Workflow} definition. The default implementation,
 * `infrastructure/config/FileWorkflowConfigStore`, reads/writes a
 * `gitwe.json` (or `.yaml`) file at the repository root; a consumer may
 * supply any other implementation (a database, a remote config service).
 *
 * @public
 */
export interface WorkflowConfigStore {
  /**
   * Loads the active workflow definition.
   * @throws {InvalidWorkflowDefinitionError} If no configuration exists, or it fails validation.
   */
  load(): Promise<Workflow>;
  /** Persists a workflow definition as the active one. */
  save(workflow: Workflow): Promise<void>;
  /** Whether a workflow configuration currently exists. */
  exists(): Promise<boolean>;
}
