import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  findConfigFile,
  loadConfig,
  readConfigFile,
  writeConfigFile,
} from "../../src/infrastructure/config/loader.js";
import { createPreset } from "../../src/domain/config/presets.js";
import { ConfigError, NotInitializedError } from "../../src/domain/errors.js";

describe("workflow definition files", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gitwe-config-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("round-trips JSON", () => {
    const path = join(dir, "gitwe.json");
    const config = createPreset("classic");
    writeConfigFile(path, config);
    expect(readConfigFile(path)).toEqual(config);
  });

  it("round-trips YAML", () => {
    const path = join(dir, "gitwe.yaml");
    const config = createPreset("gitlab");
    writeConfigFile(path, config);
    expect(readConfigFile(path)).toEqual(config);
  });

  it("searches upwards from a nested directory", () => {
    writeConfigFile(join(dir, "gitwe.json"), createPreset("github"));
    const nested = join(dir, "a", "b");
    mkdirSync(nested, { recursive: true });
    expect(findConfigFile(nested)).toBe(join(dir, "gitwe.json"));
    expect(loadConfig({ cwd: nested, root: dir }).config.name).toBe("github");
  });

  it("stops at the repository root", () => {
    const nested = join(dir, "repo");
    mkdirSync(nested);
    writeConfigFile(join(dir, "gitwe.json"), createPreset("github"));
    expect(() => loadConfig({ cwd: nested, root: nested })).toThrow(NotInitializedError);
  });

  it("reports malformed definitions", () => {
    const path = join(dir, "gitwe.json");
    writeFileSync(path, "{ not json", "utf8");
    expect(() => readConfigFile(path)).toThrow(ConfigError);
  });
});
