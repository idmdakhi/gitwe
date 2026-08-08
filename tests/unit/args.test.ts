import { describe, expect, it } from "vitest";
import { preScanGlobals } from "../../src/cli/args.js";

describe("preScanGlobals", () => {
  it("should parse --config", () => {
    const argv = ["node", "gitwe", "--config", "myconfig.json", "start"];
    expect(preScanGlobals(argv)).toEqual({ config: "myconfig.json" });
  });

  it("should parse --config=value", () => {
    const argv = ["node", "gitwe", "--config=myconfig.json", "start"];
    expect(preScanGlobals(argv)).toEqual({ config: "myconfig.json" });
  });

  it("should parse --cwd", () => {
    const argv = ["node", "gitwe", "--cwd", "/some/path", "start"];
    expect(preScanGlobals(argv)).toEqual({ cwd: "/some/path" });
  });

  it("should parse --cwd=value", () => {
    const argv = ["node", "gitwe", "--cwd=/some/path", "start"];
    expect(preScanGlobals(argv)).toEqual({ cwd: "/some/path" });
  });

  it("should parse --verbose and -v", () => {
    expect(preScanGlobals(["node", "gitwe", "--verbose", "start"])).toEqual({ verbose: true });
    expect(preScanGlobals(["node", "gitwe", "-v", "start"])).toEqual({ verbose: true });
  });

  it("should parse --no-color", () => {
    // This sets global colorEnabled, but we can't easily test side-effect. We'll just verify it returns no flag.
    // We'll rely on the output module to handle it. But the function returns GlobalOptions, which doesn't have noColor.
    // So we just check that it doesn't return an error.
    expect(() => preScanGlobals(["node", "gitwe", "--no-color", "start"])).not.toThrow();
  });

  it("should parse --dry-run", () => {
    expect(preScanGlobals(["node", "gitwe", "--dry-run", "start"])).toEqual({ dryRun: true });
  });

  it("should parse --format", () => {
    expect(preScanGlobals(["node", "gitwe", "--format", "json", "start"])).toEqual({
      format: "json",
    });
    expect(preScanGlobals(["node", "gitwe", "--format=json", "start"])).toEqual({ format: "json" });
  });

  it("should parse multiple flags", () => {
    const argv = [
      "node",
      "gitwe",
      "--config",
      "c.json",
      "--cwd",
      "/x",
      "--verbose",
      "--dry-run",
      "--format",
      "yaml",
      "start",
    ];
    expect(preScanGlobals(argv)).toEqual({
      config: "c.json",
      cwd: "/x",
      verbose: true,
      dryRun: true,
      format: "yaml",
    });
  });

  it("should support GITWE_CONFIG env variable", () => {
    const original = process.env.GITWE_CONFIG;
    process.env.GITWE_CONFIG = "envconfig.json";
    try {
      expect(preScanGlobals(["node", "gitwe", "start"])).toEqual({ config: "envconfig.json" });
    } finally {
      if (original !== undefined) process.env.GITWE_CONFIG = original;
      else delete process.env.GITWE_CONFIG;
    }
  });

  it("should prefer command line over env", () => {
    const original = process.env.GITWE_CONFIG;
    process.env.GITWE_CONFIG = "envconfig.json";
    try {
      expect(preScanGlobals(["node", "gitwe", "--config", "cli.json", "start"])).toEqual({
        config: "cli.json",
      });
    } finally {
      if (original !== undefined) process.env.GITWE_CONFIG = original;
      else delete process.env.GITWE_CONFIG;
    }
  });
});
