import { describe, expect, it } from "vitest";

import { parseWorkflowConfig } from "../../src/domain/config/parse.js";
import { ConfigError } from "../../src/domain/errors.js";

const minimal = {
  name: "custom",
  baseBranches: [{ name: "main" }],
  branchTypes: [{ name: "feature", base: "main", target: "main" }],
};

describe("parseWorkflowConfig", () => {
  it("applies defaults", () => {
    const config = parseWorkflowConfig(minimal);
    expect(config.version).toBe(1);
    expect(config.remote?.name).toBe("origin");
    expect(config.versioning?.tagPrefix).toBe("v");
    expect(config.hooks).toEqual({ enabled: true, path: ".gitwe/hooks" });
    expect(config.baseBranches[0]).toMatchObject({ name: "main" });
    expect(config.branchTypes[0]).toMatchObject({
      prefix: "feature/",
      base: "main",
      target: ["main"],
    });
    expect(config.merge?.strategy).toBe("merge");
  });

  it("rejects unsupported versions", () => {
    expect(() => parseWorkflowConfig({ ...minimal, version: 2 })).toThrow(ConfigError);
  });

  it("rejects unknown parents", () => {
    expect(() =>
      parseWorkflowConfig({
        ...minimal,
        branchTypes: [{ name: "feature", base: "nope", target: "main" }],
      }),
    ).toThrow(/unknown base/);
  });

  it("rejects duplicate prefixes", () => {
    expect(() =>
      parseWorkflowConfig({
        ...minimal,
        branchTypes: [
          { name: "feature", base: "main", target: "main", prefix: "topic/" },
          { name: "bugfix", base: "main", target: "main", prefix: "topic/" },
        ],
      }),
    ).toThrow(/share the prefix/);
  });

  it("rejects cycles in the base branch tree", () => {
    expect(() =>
      parseWorkflowConfig({
        ...minimal,
        baseBranches: [
          { name: "main", base: "develop" },
          { name: "develop", base: "main" },
        ],
        branchTypes: [{ name: "feature", base: "main", target: "main" }],
      }),
    ).toThrow(/cycle/);
  });

  it("rejects invalid strategies", () => {
    expect(() =>
      parseWorkflowConfig({
        ...minimal,
        merge: { strategy: "cherry-pick" },
      }),
    ).toThrow(/must be one of/);
  });
});
