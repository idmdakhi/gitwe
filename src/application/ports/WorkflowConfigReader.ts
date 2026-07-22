import { Workflow } from "#gitwe/domain/aggregates/Workflow";

/**
 * Application-layer port: loads a `Workflow` from some external source
 * (a file today). Keeping this in `application/ports` rather than reaching
 * into `infrastructure/config/WorkflowConfigLoader` directly preserves the
 * dependency rule — application depends on an interface, not a concrete
 * file-reading implementation.
 */
export interface WorkflowConfigReader {
  load(source: string): Workflow;
}

