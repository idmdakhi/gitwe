import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerInitCommand } from "#gitwe/cli/commands/init";

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride(); // throw instead of process.exit() on errors, so tests can catch them
  registerInitCommand(program);
  return program;
}

async function runInit(args: string[]): Promise<void> {
  await buildProgram().parseAsync(["node", "gitwe", "init", ...args]);
}

describe("init command", () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "gitwe-init-test-"));
    originalCwd = process.cwd();
    process.chdir(cwd);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(cwd, { recursive: true, force: true });
  });

  it("scaffolds the full .gitwe/ directory by default", async () => {
    await runInit([]);

    expect(existsSync(join(cwd, ".gitwe", "gitwe.json"))).toBe(true);
    expect(existsSync(join(cwd, ".gitwe", "workflows", ".gitkeep"))).toBe(true);
    expect(existsSync(join(cwd, ".gitwe", "hooks", ".gitkeep"))).toBe(true);
    expect(existsSync(join(cwd, ".gitwe", "templates", "commit-template.txt"))).toBe(true);
    expect(existsSync(join(cwd, ".gitwe", "templates", "branch-description.md"))).toBe(true);
    expect(existsSync(join(cwd, ".gitwe", "policies", "review-policy.yaml"))).toBe(true);
    expect(existsSync(join(cwd, ".gitwe", "state", "branches-state.json"))).toBe(true);

    const config = JSON.parse(readFileSync(join(cwd, ".gitwe", "gitwe.json"), "utf-8"));
    expect(config.workflow).toBe("git-flow");

    const state = JSON.parse(
      readFileSync(join(cwd, ".gitwe", "state", "branches-state.json"), "utf-8"),
    );
    expect(state).toEqual({ branches: {} });
  });

  it("writes only the main config file with --minimal", async () => {
    await runInit(["--minimal"]);

    expect(existsSync(join(cwd, ".gitwe", "gitwe.json"))).toBe(true);
    expect(existsSync(join(cwd, ".gitwe", "templates"))).toBe(false);
    expect(existsSync(join(cwd, ".gitwe", "policies"))).toBe(false);
    expect(existsSync(join(cwd, ".gitwe", "workflows"))).toBe(false);
  });

  it("respects --template for the main config's contents", async () => {
    await runInit(["--template", "trunk-based"]);
    const config = JSON.parse(readFileSync(join(cwd, ".gitwe", "gitwe.json"), "utf-8"));
    expect(config.workflow).toBe("trunk-based");
    expect(config.merge.strategy).toBe("squash");
  });

  it("rejects an unknown template", async () => {
    await expect(runInit(["--template", "does-not-exist"])).rejects.toThrow();
    expect(existsSync(join(cwd, ".gitwe"))).toBe(false);
  });

  it("writes YAML when --format yaml is given", async () => {
    await runInit(["--format", "yaml"]);
    expect(existsSync(join(cwd, ".gitwe", "gitwe.yaml"))).toBe(true);
    expect(existsSync(join(cwd, ".gitwe", "gitwe.json"))).toBe(false);
  });

  it("scaffolds into a custom --dir", async () => {
    await runInit(["--dir", ".config/gitwe"]);
    expect(existsSync(join(cwd, ".config", "gitwe", "gitwe.json"))).toBe(true);
  });

  it("does not overwrite existing files without --force", async () => {
    mkdirSync(join(cwd, ".gitwe"), { recursive: true });
    writeFileSync(join(cwd, ".gitwe", "gitwe.json"), JSON.stringify({ workflow: "custom" }));

    await runInit([]);

    const config = JSON.parse(readFileSync(join(cwd, ".gitwe", "gitwe.json"), "utf-8"));
    expect(config.workflow).toBe("custom");
  });

  it("overwrites existing files when --force is given", async () => {
    mkdirSync(join(cwd, ".gitwe"), { recursive: true });
    writeFileSync(join(cwd, ".gitwe", "gitwe.json"), JSON.stringify({ workflow: "custom" }));

    await runInit(["--force"]);

    const config = JSON.parse(readFileSync(join(cwd, ".gitwe", "gitwe.json"), "utf-8"));
    expect(config.workflow).toBe("git-flow");
  });

  it("never touches files the user already created in workflows/ even with a plain rerun", async () => {
    mkdirSync(join(cwd, ".gitwe", "workflows"), { recursive: true });
    writeFileSync(
      join(cwd, ".gitwe", "workflows", "my-flow.json"),
      JSON.stringify({ workflow: "my-flow" }),
    );

    await runInit([]);

    expect(existsSync(join(cwd, ".gitwe", "workflows", "my-flow.json"))).toBe(true);
    const custom = JSON.parse(
      readFileSync(join(cwd, ".gitwe", "workflows", "my-flow.json"), "utf-8"),
    );
    expect(custom.workflow).toBe("my-flow");
  });
});
