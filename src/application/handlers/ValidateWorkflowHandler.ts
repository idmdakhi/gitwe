import type { WorkflowConfigReader } from "../ports/WorkflowConfigReader";
import { DomainError } from "#gitwe/domain/errors";

export interface ValidateWorkflowResult {
  readonly valid: boolean;
  readonly workflowName?: string;
  readonly branchTypeCount?: number;
  readonly error?: string;
}

/** Use case: validate a workflow config file without running anything against a real repo. */
export class ValidateWorkflowHandler {
  constructor(private readonly configReader: WorkflowConfigReader) {}

  handle(configPath: string): ValidateWorkflowResult {
    try {
      const workflow = this.configReader.load(configPath);
      return {
        valid: true,
        workflowName: workflow.name,
        branchTypeCount: workflow.branchTypes.length,
      };
    } catch (error) {
      const message = error instanceof DomainError ? error.message : String(error);
      return { valid: false, error: message };
    }
  }
}

