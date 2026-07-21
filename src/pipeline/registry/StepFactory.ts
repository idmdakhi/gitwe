export interface StepFactory {
  create(options?: Record<string, unknown>): Step;
}
