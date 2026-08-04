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
    // Simulate git dir
    store = new FileOperationStateStore(gitDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should initially not exist", () => {
    expect(store.exists()).toBe(false);
    expect(store.read()).toBeUndefined();
  });

  it("should write and read state", () => {
    const state: OperationState = {
      version: 1,
      operation: "finish",
      branch: "feature/test",
      topicType: "feature",
      options: { squash: true },
      stepIndex: 2,
      startedAt: new Date().toISOString(),
      originalBranch: "develop",
      snapshots: { develop: "abc123" },
      createdTags: ["v1.0.0"],
      branchType: "",
    };
    store.write(state);
    expect(store.exists()).toBe(true);
    const read = store.read();
    expect(read).toEqual(state);
  });

  it("should require state or throw", () => {
    expect(() => store.require()).toThrow(OperationStateError);
    const state: OperationState = {
      version: 1,
      operation: "finish",
      branch: "feature/test",
      topicType: "feature",
      options: {},
      stepIndex: 0,
      startedAt: new Date().toISOString(),
      snapshots: {},
      createdTags: [],
      branchType: "",
    };
    store.write(state);
    expect(store.require()).toEqual(state);
  });

  it("should clear state", () => {
    const state: OperationState = {
      version: 1,
      operation: "finish",
      branch: "feature/test",
      topicType: "feature",
      options: {},
      stepIndex: 0,
      startedAt: new Date().toISOString(),
      snapshots: {},
      createdTags: [],
      branchType: "",
    };
    store.write(state);
    expect(store.exists()).toBe(true);
    store.clear();
    expect(store.exists()).toBe(false);
    expect(store.read()).toBeUndefined();
  });

  it("should throw on malformed JSON", () => {
    // Write invalid JSON
    const file = join(gitDir, "gitwe/operation.json");
    // Create directory
    mkdirSync(join(gitDir, "gitwe"), { recursive: true });
    writeFileSync(file, "{ invalid }", "utf8");
    expect(() => store.read()).toThrow(OperationStateError);
  });
});
