import { describe, expect, it } from "vitest";
import { ValidateWorkflowUseCase } from "../../src/application/use-cases/validate-workflow.use-case.js";
import { classicPreset } from "../../src/domain/config/presets.js";
import type { WorkflowConfig } from "../../src/domain/entities/workflow-config.entity.js";

describe("ValidateWorkflowUseCase", () => {
  it("reports a valid config as valid with no issues", () => {
    const useCase = new ValidateWorkflowUseCase();

    const result = useCase.execute(classicPreset());

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("delegates to the validator and surfaces structural issues", () => {
    const useCase = new ValidateWorkflowUseCase();
    const broken: WorkflowConfig = { ...classicPreset(), baseBranches: [] };

    const result = useCase.execute(broken);

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path === "baseBranches")).toBe(true);
  });

  it("uses an explicitly injected validator when provided", () => {
    let calledWith: WorkflowConfig | undefined;
    const fakeValidator = {
      validate: (config: WorkflowConfig) => {
        calledWith = config;
        return { valid: true, issues: [] } as any;
      },
    };
    const useCase = new ValidateWorkflowUseCase(fakeValidator as any);
    const config = classicPreset();

    useCase.execute(config);

    expect(calledWith).toBe(config);
  });
});
