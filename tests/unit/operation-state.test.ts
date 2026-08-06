// tests/unit/operation-state.test.ts

import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileOperationStateStore } from "../../src/infrastructure/state/file-operation-state-store.js";
import { OperationStateError } from "../../src/domain/errors.js";
import type { OperationState } from "../../src/application/interfaces/operation-state.js";

describe("FileOperationStateStore", () => {
  let tempDir: string;
  let gitDir: string;
  let store: FileOperationStateStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "gitwe-state-"));
    gitDir = join(tempDir, ".git");
    store = new FileOperationStateStore(gitDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should initially not exist", () => {
    expect(store.exists()).toBe(false);
    expect(store.read()).toBeUndefined();
  });

  it("should write and read state", async () => {
    const state: OperationState = {
      version: 1,
      operation: "finish",
      currentStep: "merge-into-base",
      completedSteps: ["preflight", "fetch"],
      data: {
        branch: "feature/test",
        branchType: "feature",
        options: { squash: true },
        strategy: "squash",
        targets: ["develop"],
        childBranches: [],
        snapshots: { develop: "abc123" },
        createdTags: ["v1.0.0"],
        originalBranch: "develop",
      },
      startedAt: new Date().toISOString(),
    };
    await store.write(state);
    expect(store.exists()).toBe(true);
    const read = store.read();
    expect(read).toEqual(state);
  });

  it("should require state or throw", async () => {
    expect(() => store.require()).toThrow(OperationStateError);
    const state: OperationState = {
      version: 1,
      operation: "finish",
      currentStep: "",
      completedSteps: [],
      data: {
        branch: "feature/test",
        branchType: "feature",
        options: {},
        strategy: "merge",
        targets: ["develop"],
        childBranches: [],
        snapshots: {},
        createdTags: [],
        originalBranch: undefined,
      },
      startedAt: new Date().toISOString(),
    };
    await store.write(state);
    expect(store.require()).toEqual(state);
  });

  it("should clear state", async () => {
    const state: OperationState = {
      version: 1,
      operation: "finish",
      currentStep: "",
      completedSteps: [],
      data: {
        branch: "feature/test",
        branchType: "feature",
        options: {},
        strategy: "merge",
        targets: ["develop"],
        childBranches: [],
        snapshots: {},
        createdTags: [],
        originalBranch: undefined,
      },
      startedAt: new Date().toISOString(),
    };
    await store.write(state);
    expect(store.exists()).toBe(true);
    await store.clear();
    expect(store.exists()).toBe(false);
    expect(store.read()).toBeUndefined();
  });

  it("should throw on malformed JSON", async () => {
    const file = join(gitDir, "gitwe/operation.json");
    mkdirSync(join(gitDir, "gitwe"), { recursive: true });
    writeFileSync(file, "{ invalid }", "utf8");
    expect(() => store.read()).toThrow(OperationStateError);
  });
});
