import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../../src/di/createEngine.js";
import { createPreset } from "../../src/domain/config/presets.js";
import { ShellGitRepository } from "../../src/infrastructure/git/ShellGitRepository.js";
import { HookRunner } from "../../src/infrastructure/hooks/FileHookRunner.js";
import { FileOperationStateStore } from "../../src/infrastructure/state/FileOperationStateStore.js";
import type { GitRepository } from "../../src/application/interfaces/GitRepository.js";

describe("createEngine", () => {
  it.skip("should create engine with default adapters", async () => {
    const config = createPreset("classic");
    const root = "/fake/root";
    const engine = await createEngine({ root, config });
    expect(engine).toBeDefined();
    expect(engine.root).toBe(root);
    expect(engine.workflow.config).toBe(config);
    expect(engine.git).toBeInstanceOf(ShellGitRepository);
    // We can't easily check hooks and state because they are internal, but they exist.
  });

  it("should use provided git repository", async () => {
    const mockGit: GitRepository = {
      cwd: "/fake",
      root: vi.fn().mockResolvedValue("/fake"),
      gitDir: vi.fn().mockResolvedValue("/fake/.git"),
      currentBranch: vi.fn().mockResolvedValue("main"),
      // ... other methods can be mocked as needed
    } as any;
    const config = createPreset("classic");
    const engine = await createEngine({ root: "/fake", config, git: mockGit });
    expect(engine.git).toBe(mockGit);
  });

  // Additional tests can check that hooks and state are instantiated with correct paths.
});
