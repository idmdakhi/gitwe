import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { TestRepo } from "../support/repo.js";

const isWindows = process.platform === "win32";
describe.skipIf(isWindows)("workflow hooks", () => {
  let repo: TestRepo;

  beforeEach(() => {
    repo = TestRepo.create();
    mkdirSync(join(repo.path, ".gitwe", "hooks"), { recursive: true });
  });

  afterEach(() => {
    repo.destroy();
  });

  const writeHook = (name: string, body: string): void => {
    const path = join(repo.path, ".gitwe", "hooks", name);
    writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`, "utf8");
    chmodSync(path, 0o755);
  };

  it("runs pre-start and post-start hooks with the branch in the environment", async () => {
    writeHook("post-start", 'echo "$GITWE_BRANCH" > "$PWD/hook-output.txt"');
    const engine = await repo.engine();

    await engine.start("feature", "hooked");

    expect(repo.currentBranch()).toBe("feature/hooked");
    expect(readFileSync(join(repo.path, "hook-output.txt"), "utf8").trim()).toBe("feature/hooked");
  });

  it("aborts the operation when a hook fails", async () => {
    writeHook("pre-start", "exit 3");
    const engine = await repo.engine();

    await expect(engine.start("feature", "blocked")).rejects.toThrow(/hook pre-start failed/);
    expect(repo.branches()).not.toContain("feature/blocked");
  });
});
