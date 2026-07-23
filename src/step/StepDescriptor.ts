import { StepFactory } from "#gitwe/pipeline/registry/StepFactory";
export interface StepDescriptor {
  id: string;

  version: number;

  description: string;

  factory: StepFactory;
}
