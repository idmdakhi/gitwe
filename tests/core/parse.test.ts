import { describe, expect, it } from "vitest";

import { parseWorkflowConfig } from "../../src/core/config/parse.js";
import { ConfigError } from "../../src/core/errors.js";

const minimal = {
  name: "custom",
  baseBranches: [{ name: "main" }],
  topicTypes: [{ name: "feature", parent: "main" }],
};

describe("parseWorkflowConfig", () => {
  it("applies defaults", () => {
    const config = parseWorkflowConfig(minimal);
    expect(config.version).toBe(1);
    expect(config.remote).toBe("origin");
    expect(config.tagPrefix).toBe("v");
    expect(config.hooks).toEqual({ enabled: true, path: ".gitwe/hooks" });
    expect(config.baseBranches[0]).toMatchObject({
      upstreamStrategy: "merge",
      downstreamStrategy: "merge",
      autoUpdate: false,
    });
    expect(config.topicTypes[0]).toMatchObject({ prefix: "feature/", deleteOnFinish: true });
  });

  it("rejects unsupported versions", () => {
    expect(() => parseWorkflowConfig({ ...minimal, version: 2 })).toThrow(ConfigError);
  });

  it("rejects unknown parents", () => {
    expect(() =>
      parseWorkflowConfig({ ...minimal, topicTypes: [{ name: "feature", parent: "nope" }] }),
    ).toThrow(/unknown parent branch/);
  });

  it("rejects duplicate prefixes", () => {
    expect(() =>
      parseWorkflowConfig({
        ...minimal,
        topicTypes: [
          { name: "feature", parent: "main", prefix: "topic/" },
          { name: "bugfix", parent: "main", prefix: "topic/" },
        ],
      }),
    ).toThrow(/share the prefix/);
  });

  it("rejects cycles in the base branch tree", () => {
    expect(() =>
      parseWorkflowConfig({
        ...minimal,
        baseBranches: [
          { name: "main", parent: "develop" },
          { name: "develop", parent: "main" },
        ],
      }),
    ).toThrow(/cycle/);
  });

  it("rejects invalid strategies", () => {
    expect(() =>
      parseWorkflowConfig({
        ...minimal,
        topicTypes: [{ name: "feature", parent: "main", upstreamStrategy: "cherry-pick" }],
      }),
    ).toThrow(/must be one of/);
  });
});
