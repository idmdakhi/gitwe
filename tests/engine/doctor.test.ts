import { describe, expect, it, vi, beforeEach } from "vitest";
import { DoctorUseCase } from "../../src/application/use-case/doctor.js";
import type { GitRepository } from "../../src/application/interfaces/git-repository.js";
import type { OperationStateStore } from "../../src/application/interfaces/operation-state.js";
import type { Logger } from "../../src/application/interfaces/logger.js";
import { createPreset } from "../../src/domain/config/presets.js";
import { Workflow } from "../../src/domain/workflow.js";

function createMockGit(overrides: Partial<GitRepository> = {}): GitRepository {
  return {
    cwd: "/tmp/test",
    root: vi.fn().mockResolvedValue("/tmp/test"),
    gitDir: vi.fn().mockResolvedValue("/tmp/test/.git"),
    currentBranch: vi.fn().mockResolvedValue("main"),
    branchExists: vi.fn().mockResolvedValue(true),
    listBranches: vi.fn().mockResolvedValue(["main", "develop"]),
    isClean: vi.fn().mockResolvedValue(true),
    createBranch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as GitRepository;
}

function createMockStateStore(exists = false): OperationStateStore {
  return {
    exists: vi.fn().mockReturnValue(exists),
    read: vi.fn(),
    require: vi.fn(),
    write: vi.fn(),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe("DoctorUseCase", () => {
  const workflow = new Workflow(createPreset("classic"));

  it("reports healthy when everything is fine", async () => {
    const git = createMockGit();
    const state = createMockStateStore(false);
    const doctor = new DoctorUseCase(git, workflow, state, logger);

    const report = await doctor.run();

    expect(report.ok).toBe(true);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].severity).toBe("ok");
    expect(report.fixedCount).toBe(0);
  });

  it("detects missing base branch", async () => {
    const git = createMockGit({
      branchExists: vi.fn().mockImplementation(async (name: string) => name === "main"),
    });
    const state = createMockStateStore(false);
    const doctor = new DoctorUseCase(git, workflow, state, logger);

    const report = await doctor.run();

    expect(report.ok).toBe(false);
    const missing = report.findings.find((f) => f.id === "missing-base");
    expect(missing).toBeDefined();
    expect(missing!.severity).toBe("error");
    expect(missing!.message).toContain("develop");
    expect(missing!.fixable).toBe(true);
  });

  it("creates missing base branch with --fix", async () => {
    const git = createMockGit({
      branchExists: vi.fn().mockImplementation(async (name: string) => name === "main"),
      createBranch: vi.fn().mockResolvedValue(undefined),
    });
    const state = createMockStateStore(false);
    const doctor = new DoctorUseCase(git, workflow, state, logger);

    const report = await doctor.run({ fix: true, yes: true });

    expect(git.createBranch).toHaveBeenCalledWith("develop", "main");
    const fixed = report.findings.find((f) => f.id === "missing-base");
    expect(fixed?.fixed).toBe(true);
    expect(report.fixedCount).toBe(1);
  });

  it("detects and clears stale operation state", async () => {
    const git = createMockGit();
    const state = createMockStateStore(true);
    const doctor = new DoctorUseCase(git, workflow, state, logger);

    const report = await doctor.run({ fix: true, yes: true });

    expect(state.clear).toHaveBeenCalled();
    const finding = report.findings.find((f) => f.id === "stale-operation");
    expect(finding?.fixed).toBe(true);
    expect(report.fixedCount).toBe(1);
  });

  it("reports dirty worktree without fixing", async () => {
    const git = createMockGit({
      isClean: vi.fn().mockResolvedValue(false),
    });
    const state = createMockStateStore(false);
    const doctor = new DoctorUseCase(git, workflow, state, logger);

    const report = await doctor.run({ fix: true });

    const dirty = report.findings.find((f) => f.id === "dirty-worktree");
    expect(dirty).toBeDefined();
    expect(dirty!.fixable).toBe(false);
    expect(dirty!.fixed).toBeUndefined();
  });
});
