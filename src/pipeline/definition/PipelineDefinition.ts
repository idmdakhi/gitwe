import { StepDefinition } from "#gitwe/pipeline/definition/StepDefinition";
export interface PipelineDefinition {
  name: string;

  steps: StepDefinition[];
}
