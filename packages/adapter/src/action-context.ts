export interface ActionContext {
  readonly executionId: string;

  readonly workflowId: string;

  readonly nodeId: string;

  readonly variables: ReadonlyMap<string, unknown>;
}
