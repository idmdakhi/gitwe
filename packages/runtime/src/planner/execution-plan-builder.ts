import type { ExecutionPlan } from "./execution-plan";

import type { ExecutionPlanId } from "./execution-plan-id";

import type { ExecutionStep } from "./execution-step";

export class ExecutionPlanBuilder {
  private id!: ExecutionPlanId;

  private readonly steps: ExecutionStep[] = [];

  public withId(id: ExecutionPlanId): this {
    this.id = id;

    return this;
  }

  public addStep(step: ExecutionStep): this {
    this.steps.push(step);

    return this;
  }

  public build(): ExecutionPlan {
    return {
      id: this.id,

      steps: Object.freeze([...this.steps]),
    };
  }
}
