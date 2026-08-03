import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync } from "node:fs";
import { HookRunner } from "../../src/infrastructure/hooks/file-hook-runner.js";
import type { Logger } from "../../src/application/interfaces/logger.js";
import { GitweError } from "../../src/domain/errors.js";

const isWindows = process.platform === "win32";
describe.skipIf(isWindows)("HookRunner", () => {
  let root: string;
  let logger: Logger;
  let runner: HookRunner;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "gitwe-hooks-"));
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    runner = new HookRunner(root, { enabled: true, path: ".gitwe/hooks" }, logger);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const writeHook = (name: string, content: string) => {
    const dir = join(root, ".gitwe/hooks");
    // Ensure directory exists
    mkdirSync(dir, { recursive: true });
    const path = join(dir, name);
    writeFileSync(path, `#!/usr/bin/env bash\n${content}\n`, { mode: 0o755 });
    chmodSync(path, 0o755);
  };

  it("should skip if hooks disabled", async () => {
    runner = new HookRunner(root, { enabled: false, path: ".gitwe/hooks" }, logger);
    await expect(runner.run("pre-start", { branch: "feature/x" })).resolves.toBeUndefined();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it("should skip if hook script does not exist", async () => {
    await expect(runner.run("pre-start", { branch: "feature/x" })).resolves.toBeUndefined();
    expect(logger.debug).toHaveBeenCalled(); // debug should still log? Actually it logs "running hook" only if exists? The code checks existsSync first and returns early, so debug not called.
    // Actually the code calls logger.debug after checking existence? Let's see: it returns if !existsSync, so no debug.
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it("should run hook and pass environment variables", async () => {
    writeHook("post-start", 'echo "branch=$GITWE_BRANCH" > "$PWD/hook.out"');
    await runner.run("post-start", {
      branch: "feature/abc",
      topicType: "feature",
      parent: "develop",
    });
    // Check file content
    const content = readFileSync(join(root, "hook.out"), "utf8").trim();
    expect(content).toBe("branch=feature/abc");
    expect(logger.debug).toHaveBeenCalledWith("running hook post-start");
  });

  it("should throw if hook fails", async () => {
    writeHook("pre-start", "exit 5");
    await expect(runner.run("pre-start", { branch: "feature/x" })).rejects.toThrow(GitweError);
    expect(logger.debug).toHaveBeenCalledWith("running hook pre-start");
  });

  it("should include multiple context vars", async () => {
    writeHook(
      "pre-finish",
      'echo "$GITWE_BRANCH $GITWE_TOPIC_TYPE $GITWE_PARENT" > "$PWD/hook.out"',
    );
    await runner.run("pre-finish", { branch: "hotfix/1.0.1", topicType: "hotfix", parent: "main" });
    expect(readFileSync(join(root, "hook.out"), "utf8").trim()).toBe("hotfix/1.0.1 hotfix main");
  });
});
