import type { WorkflowStep } from "./workflow-step.js";

export interface WorkflowListener {
  beforeStep?(step: WorkflowStep): Promise<void>;
  afterStep?(step: WorkflowStep): Promise<void>;
  onResume?(step: WorkflowStep): Promise<void>;
  onRollback?(step: WorkflowStep): Promise<void>;
  onError?(step: WorkflowStep, error: Error): Promise<void>;
}
