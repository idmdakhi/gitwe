import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ConflictError } from "../../src/core/errors.js";
import type { Engine } from "../../src/engine/Engine.js";
import { TestRepo } from "../support/repo.js";

describe("Engine.finish", () => {
  let repo: TestRepo;
  let engine: Engine;

  beforeEach(async () => {
    repo = TestRepo.create();
    engine = await repo.engine();
  });

  afterEach(() => {
    repo.destroy();
  });

  const startFeature = async (name: string, file = `${name}.txt`): Promise<void> => {
    await engine.start("feature", name);
    repo.commit(file, name, `work on ${name}`);
  };

  it("merges a feature into its parent and deletes it", async () => {
    await startFeature("login");

    const result = await engine.finish(engine.resolve("feature", "login"));

    expect(result).toMatchObject({
      branch: "feature/login",
      parent: "develop",
      strategy: "merge",
      deletedLocal: true,
      finalBranch: "develop",
    });
    expect(repo.branches()).not.toContain("feature/login");
    expect(repo.log("develop")).toContain("work on login");
    expect(repo.currentBranch()).toBe("develop");
  });

  it("keeps the branch with --keep", async () => {
    await startFeature("keepme");
    await engine.finish(engine.resolve("feature", "keepme"), { keep: true });
    expect(repo.branches()).toContain("feature/keepme");
  });

  it("squashes when asked", async () => {
    await engine.start("feature", "squashed");
    repo.commit("a.txt", "a", "first");
    repo.commit("b.txt", "b", "second");

    await engine.finish(engine.resolve("feature", "squashed"), {
      squash: true,
      squashMessage: "feat: squashed feature",
    });

    const log = repo.log("develop");
    expect(log[0]).toBe("feat: squashed feature");
    expect(log).not.toContain("first");
  });

  it("rebases before merging when the strategy is rebase", async () => {
    repo.git("checkout", "-q", "develop");
    await engine.start("feature", "rebased");
    repo.commit("a.txt", "a", "topic commit");
    repo.git("checkout", "-q", "develop");
    repo.commit("base.txt", "base", "parent commit");

    await engine.finish(engine.resolve("feature", "rebased"), { rebase: true });

    const log = repo.log("develop");
    expect(log.slice(0, 2)).toEqual(["topic commit", "parent commit"]);
  });

  it("tags a release and back-merges into the auto-updating child", async () => {
    repo.git("checkout", "-q", "develop");
    repo.commit("dev.txt", "dev", "dev work");
    await engine.start("release", "1.2.0");
    repo.commit("changelog.md", "notes", "prepare 1.2.0");

    const result = await engine.finish(engine.resolve("release", "1.2.0"));

    expect(result.tag).toBe("v1.2.0");
    expect(result.updatedBranches).toEqual(["develop"]);
    expect(repo.tags()).toEqual(["v1.2.0"]);
    expect(repo.log("main")).toContain("prepare 1.2.0");
    expect(repo.log("develop")).toContain("prepare 1.2.0");
    expect(repo.currentBranch()).toBe("develop");
  });

  it("honours a custom tag name and message", async () => {
    await engine.start("hotfix", "1.0.1");
    repo.commit("fix.txt", "fix", "fix it");

    await engine.finish(engine.resolve("hotfix", "1.0.1"), {
      tagName: "release-1.0.1",
      message: "hotfix release",
    });

    expect(repo.tags()).toEqual(["release-1.0.1"]);
    expect(repo.git("tag", "-l", "--format=%(contents:subject)", "release-1.0.1")).toBe(
      "hotfix release",
    );
  });

  it("expands placeholders in merge messages", async () => {
    await startFeature("messages");
    await engine.finish(engine.resolve("feature", "messages"), {
      mergeMessage: "integrate %b into %p",
    });
    expect(repo.log("develop")[0]).toBe("integrate feature/messages into develop");
  });

  it("stops on conflicts and resumes with continue", async () => {
    await engine.start("feature", "conflicting");
    repo.commit("shared.txt", "topic", "topic version");
    repo.git("checkout", "-q", "develop");
    repo.commit("shared.txt", "base", "base version");

    await expect(engine.finish(engine.resolve("feature", "conflicting"))).rejects.toThrow(
      ConflictError,
    );
    expect(repo.currentBranch()).toBe("develop");

    repo.write("shared.txt", "resolved");
    repo.git("add", "shared.txt");
    const result = await engine.continueOperation();

    expect(result.deletedLocal).toBe(true);
    expect(repo.branches()).not.toContain("feature/conflicting");
    expect(repo.git("show", "develop:shared.txt")).toBe("resolved");
  });

  it("restores the previous state on abort", async () => {
    await engine.start("feature", "abortme");
    repo.commit("shared.txt", "topic", "topic version");
    repo.git("checkout", "-q", "develop");
    repo.commit("shared.txt", "base", "base version");
    const developBefore = repo.git("rev-parse", "develop");

    await expect(engine.finish(engine.resolve("feature", "abortme"))).rejects.toThrow(
      ConflictError,
    );
    await engine.abortOperation();

    expect(repo.git("rev-parse", "develop")).toBe(developBefore);
    expect(repo.branches()).toContain("feature/abortme");
    expect(repo.git("status", "--porcelain")).toBe("");
  });

  it("removes a tag it created when the finish is aborted", async () => {
    repo.git("checkout", "-q", "develop");
    repo.commit("shared.txt", "develop", "develop version");
    await engine.start("release", "9.9.9");
    repo.commit("release.txt", "release", "release work");
    repo.git("checkout", "-q", "main");
    repo.commit("shared.txt", "main", "main version");

    await expect(engine.finish(engine.resolve("release", "9.9.9"))).rejects.toThrow(ConflictError);
    await engine.abortOperation();

    expect(repo.tags()).not.toContain("v9.9.9");
    expect(repo.branches()).toContain("release/9.9.9");
  });

  it("refuses to finish a branch that does not exist", async () => {
    await expect(engine.finish(engine.resolve("feature", "ghost"))).rejects.toThrow(
      /does not exist/,
    );
  });
});
