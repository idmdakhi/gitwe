import { beforeEach, describe, expect, it } from "vitest";
import { ConfigValidatorService } from "../../src/domain/services/config-validator.service.js";
import { classicPreset } from "../../src/domain/config/presets.js";
import type { WorkflowConfig } from "../../src/domain/entities/workflow-config.entity.js";

describe("ConfigValidatorService", () => {
  const validator = new ConfigValidatorService();

  beforeEach(() => {});

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

describe("ConfigValidatorService", () => {
  let service: ConfigValidatorService;
  let preset: WorkflowConfig;

  beforeEach(() => {
    service = new ConfigValidatorService();
    preset = classicPreset();
  });

  describe("validate versioning.tagTargets", () => {
    it('should accept "root" when a root branch exists', () => {
      const config: WorkflowConfig = {
        ...preset,
        baseBranches: [{ name: "main" }, { name: "develop", base: "main" }],
        versioning: { enabled: true, tagTargets: ["root"] },
        // برای جلوگیری از خطاهای دیگر، branchTypes را خالی یا معتبر بگذارید
      };
      const result = service.validate(config);
      // مطمئن شوید خطایی با path="versioning.tagTargets" وجود ندارد
      expect(result.issues).not.toContainEqual(
        expect.objectContaining({ path: "versioning.tagTargets" }),
      );
    });

    it('should accept ["root", "develop"] when both exist', () => {
      const config: WorkflowConfig = {
        ...preset,
        baseBranches: [{ name: "main" }, { name: "develop", base: "main" }],
        versioning: { enabled: true, tagTargets: ["root", "develop"] },
      };
      const result = service.validate(config);
      expect(result.issues).not.toContainEqual(
        expect.objectContaining({ path: "versioning.tagTargets" }),
      );
    });

    it('should reject "root" when no root branch exists', () => {
      // کانفیگی که هیچ برنچ ریشه‌ای ندارد (همه base دارند)
      const config: WorkflowConfig = {
        ...preset,
        baseBranches: [
          { name: "develop", base: "main" }, // main وجود ندارد -> باعث خطای دیگر می‌شود
        ],
        versioning: { enabled: true, tagTargets: ["root"] },
      };
      const result = service.validate(config);
      // انتظار داریم حداقل یک خطا با path="versioning.tagTargets" و شامل "root" باشد
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "versioning.tagTargets",
          message: expect.stringContaining("root"),
        }),
      );
    });

    it("should reject a non-existent target branch", () => {
      const config: WorkflowConfig = {
        ...preset,
        baseBranches: [{ name: "main" }, { name: "develop", base: "main" }],
        versioning: { enabled: true, tagTargets: ["nonexistent"] },
      };
      const result = service.validate(config);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "versioning.tagTargets",
          message: expect.stringContaining("nonexistent"),
        }),
      );
    });

    it('should accept multiple targets including "root" and other valid branches', () => {
      const config: WorkflowConfig = {
        ...preset,
        baseBranches: [
          { name: "main" },
          { name: "develop", base: "main" },
          { name: "release", base: "develop" },
        ],
        versioning: { enabled: true, tagTargets: ["root", "develop", "release"] },
      };
      const result = service.validate(config);
      expect(result.issues).not.toContainEqual(
        expect.objectContaining({ path: "versioning.tagTargets" }),
      );
    });

    it("should reject when one of multiple targets is invalid", () => {
      const config: WorkflowConfig = {
        ...preset,
        baseBranches: [{ name: "main" }, { name: "develop", base: "main" }],
        versioning: { enabled: true, tagTargets: ["root", "invalid"] },
      };
      const result = service.validate(config);
      // حداقل یک خطا با path="versioning.tagTargets" و شامل "invalid" باشد
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "versioning.tagTargets",
          message: expect.stringContaining("invalid"),
        }),
      );
    });
  });
});
