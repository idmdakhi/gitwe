export interface StepDescriptor {
  id: string;

  version: number;

  description: string;

  factory: StepFactory;
}
