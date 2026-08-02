import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TestRepo } from "../support/repo.js";
import type { Engine } from "../../src/application/Engine.js";
import { ConflictError, ValidationError } from "../../src/domain/errors.js";

describe("Engine - Comprehensive Tests", () => {
  let repo: TestRepo;
  let engine: Engine;

  beforeEach(async () => {
    repo = TestRepo.create();
    engine = await repo.engine();
  });

  afterEach(() => {
    repo.destroy();
  });

  describe("start", () => {
    it("should create a topic branch from configured start point", async () => {
      repo.git("checkout", "-q", "develop");
      repo.commit("dev.txt", "dev", "dev only");
      const result = await engine.start("feature", "login");
      expect(result).toEqual({ branch: "feature/login", startPoint: "develop" });
      expect(repo.currentBranch()).toBe("feature/login");
      expect(repo.log()).toContain("dev only");
    });

    it("should use explicit base start point", async () => {
      const result = await engine.start("feature", "from-main", { base: "main" });
      expect(result.startPoint).toBe("main");
    });

    it("should fetch remote when --fetch is used", async () => {
      // Setup remote
      const remote = TestRepo.createBare();
      repo.git("remote", "add", "origin", remote);
      repo.git("push", "-q", "origin", "main", "develop");
      await engine.start("feature", "fetched", { fetch: true });
      expect(repo.currentBranch()).toBe("feature/fetched");
    });

    it("should reject if working tree is dirty", async () => {
      repo.write("README.md", "dirty");
      await expect(engine.start("feature", "x")).rejects.toThrow(ValidationError);
    });

    it("should reject if branch already exists", async () => {
      await engine.start("feature", "login");
      repo.git("checkout", "-q", "develop");
      await expect(engine.start("feature", "login")).rejects.toThrow(/already exists/);
    });

    it("should reject invalid branch names", async () => {
      await expect(engine.start("feature", "bad name")).rejects.toThrow(/invalid branch name/);
    });
  });

  describe("update", () => {
    it("should merge parent changes into topic branch", async () => {
      await engine.start("feature", "sync");
      repo.git("checkout", "-q", "develop");
      repo.commit("base.txt", "base", "parent commit");
      const result = await engine.update(engine.resolve("feature", "sync"));
      expect(result.strategy).toBe("merge");
      expect(result.alreadyUpToDate).toBe(false);
      expect(repo.currentBranch()).toBe("feature/sync");
      expect(repo.log()).toContain("parent commit");
    });

    it("should rebase when asked", async () => {
      await engine.start("feature", "rebase-me");
      repo.commit("topic.txt", "topic", "topic commit");
      repo.git("checkout", "-q", "develop");
      repo.commit("base.txt", "base", "parent commit");
      const result = await engine.update(engine.resolve("feature", "rebase-me"), { rebase: true });
      expect(result.strategy).toBe("rebase");
      expect(repo.log().slice(0, 2)).toEqual(["topic commit", "parent commit"]);
    });

    it("should report already up to date", async () => {
      await engine.start("feature", "fresh");
      const result = await engine.update(engine.resolve("feature", "fresh"));
      expect(result.alreadyUpToDate).toBe(true);
    });
  });

  describe("finish", () => {
    it("should merge topic branch into parent and delete it", async () => {
      await engine.start("feature", "login");
      repo.commit("a.txt", "a", "feature work");
      const result = await engine.finish(engine.resolve("feature", "login"));
      expect(result).toMatchObject({
        branch: "feature/login",
        parent: "develop",
        strategy: "merge",
        deletedLocal: true,
        finalBranch: "develop",
      });
      expect(repo.branches()).not.toContain("feature/login");
      expect(repo.log("develop")).toContain("feature work");
    });

    it("should keep branch with --keep", async () => {
      await engine.start("feature", "keepme");
      repo.commit("a.txt", "a", "work");
      await engine.finish(engine.resolve("feature", "keepme"), { keep: true });
      expect(repo.branches()).toContain("feature/keepme");
    });

    it("should squash commits when asked", async () => {
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

    it("should rebase before merging when strategy is rebase", async () => {
      repo.git("checkout", "-q", "develop");
      await engine.start("feature", "rebased");
      repo.commit("a.txt", "a", "topic commit");
      repo.git("checkout", "-q", "develop");
      repo.commit("base.txt", "base", "parent commit");
      await engine.finish(engine.resolve("feature", "rebased"), { rebase: true });
      const log = repo.log("develop");
      expect(log.slice(0, 2)).toEqual(["topic commit", "parent commit"]);
    });

    it("should tag releases and back-merge to auto-updating children", async () => {
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
    });

    it("should handle conflicts and resume with --continue", async () => {
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
      expect(repo.git("show", "develop:shared.txt")).toBe("resolved");
    });

    it("should abort and restore previous state", async () => {
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
  });

  describe("publish and track", () => {
    let remote: string;

    beforeEach(async () => {
      remote = TestRepo.createBare();
      repo.git("remote", "add", "origin", remote);
      repo.git("push", "-q", "origin", "main", "develop");
      engine = await repo.engine();
    });

    afterEach(() => {
      repo.destroy();
    });

    it("should publish a topic branch and set upstream", async () => {
      await engine.start("feature", "shared");
      repo.commit("a.txt", "a", "shared work");
      const published = await engine.publish(engine.resolve("feature", "shared"));
      expect(published).toBe("origin/feature/shared");
      expect(repo.git("rev-parse", "--abbrev-ref", "feature/shared@{upstream}")).toBe(
        "origin/feature/shared",
      );
    });

    it("should track a branch published by someone else", async () => {
      await engine.start("feature", "collab");
      repo.commit("a.txt", "a", "collab work");
      await engine.publish(engine.resolve("feature", "collab"));
      const other = TestRepo.create();
      other.git("remote", "add", "origin", remote);
      other.git("fetch", "-q", "origin");
      const otherEngine = await other.engine();
      const branch = await otherEngine.track("feature", "collab");
      expect(branch).toBe("feature/collab");
      expect(other.currentBranch()).toBe("feature/collab");
      other.destroy();
    });

    it("should delete remote branch when finishing", async () => {
      await engine.start("feature", "published");
      repo.commit("a.txt", "a", "published work");
      await engine.publish(engine.resolve("feature", "published"));
      const result = await engine.finish(engine.resolve("feature", "published"), { push: true });
      expect(result.deletedRemote).toBe(true);
      expect(repo.git("ls-remote", "--heads", "origin", "feature/published")).toBe("");
    });

    it("should refuse to finish if branch is behind remote", async () => {
      await engine.start("feature", "behind");
      repo.commit("a.txt", "a", "local work");
      await engine.publish(engine.resolve("feature", "behind"));
      // Push another commit from another repo
      const other = TestRepo.create();
      other.git("remote", "add", "origin", remote);
      other.git("fetch", "-q", "origin");
      other.git("checkout", "-q", "-b", "feature/behind", "origin/feature/behind");
      other.commit("b.txt", "b", "their work");
      other.git("push", "-q", "origin", "feature/behind");
      other.destroy();
      await expect(engine.finish(engine.resolve("feature", "behind"))).rejects.toThrow(
        /behind origin\/feature\/behind/,
      );
      const forced = await engine.finish(engine.resolve("feature", "behind"), { force: true });
      expect(forced.deletedLocal).toBe(true);
    });
  });

  describe("list and checkout", () => {
    it("should list topic branches", async () => {
      await engine.start("feature", "user-auth");
      repo.commit("a.txt", "a", "work");
      await engine.start("feature", "user-profile", { base: "develop" });
      await engine.start("feature", "billing", { base: "develop" });
      const all = await engine.listTopics(engine.workflow.requireTopicType("feature"));
      expect(all.map((b) => b.name)).toEqual([
        "feature/billing",
        "feature/user-auth",
        "feature/user-profile",
      ]);
      const filtered = await engine.listTopics(
        engine.workflow.requireTopicType("feature"),
        "user-*",
      );
      expect(filtered.map((b) => b.name)).toEqual(["feature/user-auth", "feature/user-profile"]);
      expect(filtered[0].ahead).toBe(1);
    });

    it("should checkout by unique prefix", async () => {
      await engine.start("feature", "user-auth");
      repo.git("checkout", "-q", "develop");
      const branch = await engine.checkout(engine.workflow.requireTopicType("feature"), "user");
      expect(branch).toBe("feature/user-auth");
      expect(repo.currentBranch()).toBe("feature/user-auth");
    });

    it("should refuse ambiguous checkout", async () => {
      await engine.start("feature", "user-auth");
      await engine.start("feature", "user-profile", { base: "develop" });
      repo.git("checkout", "-q", "develop");
      await expect(
        engine.checkout(engine.workflow.requireTopicType("feature"), "user"),
      ).rejects.toThrow(/matches multiple branches/);
    });
  });

  describe("rename and delete", () => {
    it("should rename a topic branch", async () => {
      await engine.start("feature", "old-name");
      const renamed = await engine.rename(engine.resolve("feature", "old-name"), "new-name");
      expect(renamed).toBe("feature/new-name");
      expect(repo.branches()).toContain("feature/new-name");
    });

    it("should delete a topic branch and switch away", async () => {
      await engine.start("feature", "doomed");
      const result = await engine.deleteTopic(engine.resolve("feature", "doomed"), { force: true });
      expect(result.branch).toBe("feature/doomed");
      expect(repo.branches()).not.toContain("feature/doomed");
      expect(repo.currentBranch()).toBe("develop");
    });
  });

  describe("current and overview", () => {
    it("should get current topic branch", async () => {
      await engine.start("feature", "current");
      const topic = await engine.currentTopic();
      expect(topic).toMatchObject({ branch: "feature/current", shortName: "current" });
    });

    it("should reject base branches as topics", async () => {
      repo.git("checkout", "-q", "develop");
      await expect(engine.currentTopic()).rejects.toThrow(/not a topic branch/);
    });

    it("should generate overview report", async () => {
      await engine.start("feature", "reported");
      const report = await engine.overview();
      expect(report.workflow).toBe("classic");
      expect(report.baseBranches.map((b) => b.name)).toEqual(["main", "develop"]);
      expect(report.topicTypes.find((t) => t.name === "feature")?.branches).toEqual([
        "feature/reported",
      ]);
      expect(report.health).toEqual([{ level: "ok", message: "workflow is healthy" }]);
    });

    it("should flag missing base branches", async () => {
      repo.git("checkout", "-q", "main");
      repo.git("branch", "-D", "develop");
      const report = await engine.overview();
      expect(report.health).toContainEqual({
        level: "error",
        message: 'base branch "develop" is missing',
      });
    });
  });

  describe("createMissingBaseBranches", () => {
    it("should create missing base branches", async () => {
      repo.git("branch", "-D", "develop");
      const created = await engine.createMissingBaseBranches();
      expect(created).toEqual(["develop"]);
      expect(repo.branches()).toContain("develop");
    });
  });

  describe("hooks", () => {
    it("should run hooks and abort on failure", async () => {
      const hookPath = ".gitwe/hooks/pre-start";
      repo.write(hookPath, "#!/usr/bin/env bash\nexit 3");
      repo.git("chmod", "+x", hookPath);
      await expect(engine.start("feature", "blocked")).rejects.toThrow(/hook pre-start failed/);
      expect(repo.branches()).not.toContain("feature/blocked");
    });
  });
  // داخل describe('Engine - Comprehensive Tests')
  describe("resolveTarget", () => {
    it("should resolve with explicit type and name", async () => {
      const resolved = engine.resolve("feature", "login");
      expect(resolved).toMatchObject({ branch: "feature/login", shortName: "login" });
    });

    it("should resolve current branch when name omitted", async () => {
      await engine.start("feature", "current-branch");
      const resolved = await engine.resolveTarget(undefined);
      expect(resolved.branch).toBe("feature/current-branch");
    });

    it("should throw if current branch is not a topic", async () => {
      await repo.git("checkout", "main");
      await expect(engine.resolveTarget(undefined)).rejects.toThrow(/not a topic branch/);
    });

    it("should throw if type mismatch with current branch", async () => {
      await engine.start("feature", "mismatch");
      const type = engine.workflow.requireTopicType("release");
      await expect(engine.resolveTarget(type)).rejects.toThrow(
        /current branch is a feature branch, not a release branch/,
      );
    });

    it("should throw if branch does not match any prefix", async () => {
      await expect(engine.resolveTarget(undefined, "unknown-branch")).rejects.toThrow(
        /does not match any configured topic prefix/,
      );
    });
  });

  describe("createMissingBaseBranches", () => {
    it("should create missing base branches", async () => {
      repo.git("branch", "-D", "develop");
      const created = await engine.createMissingBaseBranches();
      expect(created).toEqual(["develop"]);
      expect(repo.branches()).toContain("develop");
    });

    it("should do nothing if no commits", async () => {
      // Create a new empty repo
      const emptyRepo = TestRepo.create();
      emptyRepo.git("checkout", "--orphan", "empty");
      // Remove initial commit? Actually we have initial commit, so we need to create a fresh repo without commits.
      // But TestRepo always creates an initial commit. We can hack by removing .git and re-init?
      // For simplicity, we can test that if no commits, it returns [].
      // We'll mock hasCommits to return false.
      const engineEmpty = await emptyRepo.engine();
      const spy = vi.spyOn(engineEmpty.git, "hasCommits").mockResolvedValue(false);
      const created = await engineEmpty.createMissingBaseBranches();
      expect(created).toEqual([]);
      spy.mockRestore();
      emptyRepo.destroy();
    });
  });
});
