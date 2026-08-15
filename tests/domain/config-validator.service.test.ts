import { describe, expect, it } from "vitest";
import { ConfigValidatorService } from "../../src/domain/services/config-validator.service.js";
import { classicPreset } from "../../src/infrastructure/config/presets.js";
import type { WorkflowConfig } from "../../src/domain/entities/workflow-config.entity.js";

describe("ConfigValidatorService", () => {
  const validator = new ConfigValidatorService();

  it("accepts the classic preset", () => {
    expect(validator.validate(classicPreset()).valid).toBe(true);
  });

  it("rejects a base-branch cycle", () => {
    const config: WorkflowConfig = {
      ...classicPreset(),
      baseBranches: [
        { name: "main", base: "develop" },
        { name: "develop", base: "main" },
      ],
    };
    const result = validator.validate(config);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("cycle"))).toBe(true);
  });

  it("rejects duplicate branch-type prefixes", () => {
    const preset = classicPreset();
    const config: WorkflowConfig = {
      ...preset,
      branchTypes: preset.branchTypes.map((t) => ({ ...t, prefix: "feature/" })),
    };
    const result = validator.validate(config);
    expect(result.issues.some((i) => i.message.includes("already used"))).toBe(true);
  });

  it("rejects a branch type referencing an unknown base", () => {
    const preset = classicPreset();
    const config: WorkflowConfig = {
      ...preset,
      branchTypes: [{ ...preset.branchTypes[0]!, base: "does-not-exist" }],
    };
    const result = validator.validate(config);
    expect(result.issues.some((i) => i.message.includes("does-not-exist"))).toBe(true);
  });
});
