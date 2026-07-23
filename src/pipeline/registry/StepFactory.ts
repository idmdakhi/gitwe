import type { Step } from "#gitwe/pipeline/Step";

export interface StepFactory {
  create(options?: Record<string, unknown>): Step;
}
