import { describe, expect, it } from "vitest";

import { parseWorkflowConfig } from "../../src/domain/config/parse.js";
import { ConfigError } from "../../src/domain/errors.js";

const minimal = {
  name: "custom",
  baseBranches: [{ name: "main" }],
  branchTypes: [{ name: "feature", base: "main", target: ["main"] }],
};

describe("parseWorkflowConfig", () => {
  it("applies defaults", () => {
    const config = parseWorkflowConfig(minimal);
    expect(config.version).toBe(1);
    expect(config.remote.name).toBe("origin");
    expect(config.versioning.tagPrefix).toBe("v");
    expect(config.hooks).toEqual({ enabled: true, path: ".gitwe/hooks" });
    expect(config.baseBranches[0]).toMatchObject({});
    expect(config.branchTypes[0]).toMatchObject({ prefix: "feature/" });
  });

  it("rejects unsupported versions", () => {
    expect(() => parseWorkflowConfig({ ...minimal, version: 2 })).toThrow(ConfigError);
  });

  it("rejects unknown parents", () => {
    expect(() =>
      parseWorkflowConfig({ ...minimal, branchTypes: [{ name: "feature", base: "nope" }] }),
    ).toThrow(/unknown parent branch/);
  });

  it("rejects duplicate prefixes", () => {
    expect(() =>
      parseWorkflowConfig({
        ...minimal,
        branchTypes: [
          { name: "feature", base: "main", prefix: "topic/" },
          { name: "bugfix", base: "main", prefix: "topic/" },
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
      }),
    ).toThrow(/cycle/);
  });

  it("rejects invalid strategies", () => {
    expect(() =>
      parseWorkflowConfig({
        ...minimal,
        branchTypes: [{ name: "feature", base: "main" }],
      }),
    ).toThrow(/must be one of/);
  });
});
