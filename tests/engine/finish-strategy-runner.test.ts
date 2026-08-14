import { describe, expect, it, vi } from "vitest";
import {
  runFinishStrategy,
  resolveEffectiveStrategy,
  abortInProgressStrategy,
} from "../../src/application/workflows/finish-strategy-runner.js";
import type { GitRepository } from "../../src/application/interfaces/git-repository.js";
import type { Logger } from "../../src/application/interfaces/logger.js";

function mockGit(overrides: Record<string, unknown> = {}): GitRepository {
  return {
    checkout: vi.fn().mockResolvedValue(undefined),
    rebase: vi.fn().mockResolvedValue(undefined),
    merge: vi.fn().mockResolvedValue(undefined),
    conflictedFiles: vi.fn().mockResolvedValue([]),
    cherryPickRange: vi.fn().mockResolvedValue(undefined),
    cherryPickAbort: vi.fn().mockResolvedValue(undefined),
    abortRebase: vi.fn().mockResolvedValue(undefined),
    abortMerge: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as GitRepository;
}

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe("resolveEffectiveStrategy", () => {
  it("prefers CLI override", () => {
    expect(
      resolveEffectiveStrategy({
        cliStrategy: "cherry-pick",
        branchTypeStrategy: "squash",
        workflowStrategy: "merge",
      }),
    ).toBe("cherry-pick");
  });

  it("falls back to branch-type then workflow then merge", () => {
    expect(
      resolveEffectiveStrategy({
        branchTypeStrategy: "rebase",
        workflowStrategy: "squash",
      }),
    ).toBe("rebase");

    expect(
      resolveEffectiveStrategy({
        workflowStrategy: "squash",
      }),
    ).toBe("squash");

    expect(resolveEffectiveStrategy({})).toBe("merge");
  });
});

describe("runFinishStrategy", () => {
  it("returns useClassicPath for merge/squash/rebase", async () => {
    const git = mockGit();
    for (const strategy of ["merge", "squash", "rebase"] as const) {
      const result = await runFinishStrategy({
        git,
        logger,
        topicBranch: "feature/x",
        target: "develop",
        strategy,
      });
      expect(result.useClassicPath).toBe(true);
      expect(result.done).toBe(false);
    }
  });

  it("executes cherry-pick path - skips completed sub-steps on resume", async () => {
    const git = mockGit();
    const completed: string[] = [];
    const result = await runFinishStrategy({
      git,
      logger,
      topicBranch: "feature/x",
      target: "develop",
      strategy: "cherry-pick",
      completedSubSteps: ["checkout-target"],
      markComplete: async (s) => {
        completed.push(s);
      },
    });
    expect(result.useClassicPath).toBe(false);
    expect(result.done).toBe(true);
    expect(result.strategy).toBe("cherry-pick");
    expect(completed).toContain("checkout-target");
    expect(completed).toContain("cherry-pick-range");
    // checkout-target already done – only cherry-pick-range should be new
    expect(completed).toEqual(["cherry-pick-range"]);
    expect(git.checkout).not.toHaveBeenCalled();
  });

  it("executes rebase-merge path", async () => {
    const git = mockGit();
    const completed: string[] = [];
    const result = await runFinishStrategy({
      git,
      logger,
      topicBranch: "feature/x",
      target: "develop",
      strategy: "rebase-merge",
      markComplete: async (s) => {
        completed.push(s);
      },
    });
    expect(result.useClassicPath).toBe(false);
    expect(result.done).toBe(true);
    expect(result.strategy).toBe("rebase-merge");
    expect(completed).toEqual(
      expect.arrayContaining([
        "checkout-topic",
        "rebase-onto-target",
        "checkout-target",
        "merge-no-ff",
      ]),
    );
  });
});

describe("abortInProgressStrategy", () => {
  it("best-effort aborts cherry-pick, rebase and merge", async () => {
    const git = mockGit();
    await abortInProgressStrategy(git, logger);
    expect((git as any).cherryPickAbort).toHaveBeenCalled();
    expect((git as any).abortRebase).toHaveBeenCalled();
    expect((git as any).abortMerge).toHaveBeenCalled();
  });
});
