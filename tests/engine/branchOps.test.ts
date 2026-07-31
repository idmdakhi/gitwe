import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Engine } from "../../src/engine/Engine.js";
import { TestRepo } from "../support/repo.js";

describe("Engine branch operations", () => {
  let repo: TestRepo;
  let engine: Engine;

  beforeEach(async () => {
    repo = TestRepo.create();
    engine = await repo.engine();
  });

  afterEach(() => {
    repo.destroy();
  });

  it("updates a topic branch from its parent", async () => {
    await engine.start("feature", "sync");
    repo.git("checkout", "-q", "develop");
    repo.commit("base.txt", "base", "parent commit");

    const result = await engine.update(engine.resolve("feature", "sync"));

    expect(result).toMatchObject({ strategy: "merge", alreadyUpToDate: false });
    expect(repo.currentBranch()).toBe("feature/sync");
    expect(repo.log()).toContain("parent commit");
  });

  it("rebases when asked", async () => {
    await engine.start("feature", "rebase-me");
    repo.commit("topic.txt", "topic", "topic commit");
    repo.git("checkout", "-q", "develop");
    repo.commit("base.txt", "base", "parent commit");

    const result = await engine.update(engine.resolve("feature", "rebase-me"), { rebase: true });

    expect(result.strategy).toBe("rebase");
    expect(repo.log().slice(0, 2)).toEqual(["topic commit", "parent commit"]);
  });

  it("reports an up-to-date branch", async () => {
    await engine.start("feature", "fresh");
    const result = await engine.update(engine.resolve("feature", "fresh"));
    expect(result.alreadyUpToDate).toBe(true);
  });

  it("lists topic branches with a glob and ahead counts", async () => {
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

    const filtered = await engine.listTopics(engine.workflow.requireTopicType("feature"), "user-*");
    expect(filtered.map((b) => b.name)).toEqual(["feature/user-auth", "feature/user-profile"]);
    expect(filtered[0].ahead).toBe(1);
  });

  it("checks out by unique prefix", async () => {
    await engine.start("feature", "user-auth");
    repo.git("checkout", "-q", "develop");

    const branch = await engine.checkout(engine.workflow.requireTopicType("feature"), "user");
    expect(branch).toBe("feature/user-auth");
    expect(repo.currentBranch()).toBe("feature/user-auth");
  });

  it("refuses an ambiguous checkout", async () => {
    await engine.start("feature", "user-auth");
    await engine.start("feature", "user-profile", { base: "develop" });
    repo.git("checkout", "-q", "develop");

    await expect(
      engine.checkout(engine.workflow.requireTopicType("feature"), "user"),
    ).rejects.toThrow(/matches multiple branches/);
  });

  it("renames a topic branch", async () => {
    await engine.start("feature", "old-name");
    const renamed = await engine.rename(engine.resolve("feature", "old-name"), "new-name");
    expect(renamed).toBe("feature/new-name");
    expect(repo.branches()).toContain("feature/new-name");
  });

  it("deletes a topic branch, switching away from it first", async () => {
    await engine.start("feature", "doomed");
    const result = await engine.deleteTopic(engine.resolve("feature", "doomed"), { force: true });
    expect(result.branch).toBe("feature/doomed");
    expect(repo.branches()).not.toContain("feature/doomed");
    expect(repo.currentBranch()).toBe("develop");
  });

  it("resolves the current branch as a topic", async () => {
    await engine.start("feature", "current");
    const topic = await engine.currentTopic();
    expect(topic).toMatchObject({ branch: "feature/current", shortName: "current" });
  });

  it("rejects base branches as topics", async () => {
    repo.git("checkout", "-q", "develop");
    await expect(engine.currentTopic()).rejects.toThrow(/not a topic branch/);
  });

  it("reports workflow health in the overview", async () => {
    await engine.start("feature", "reported");
    const report = await engine.overview();

    expect(report.workflow).toBe("classic");
    expect(report.baseBranches.map((b) => b.name)).toEqual(["main", "develop"]);
    expect(report.topicTypes.find((t) => t.name === "feature")?.branches).toEqual([
      "feature/reported",
    ]);
    expect(report.health).toEqual([{ level: "ok", message: "workflow is healthy" }]);
  });

  it("flags missing base branches", async () => {
    repo.git("checkout", "-q", "main");
    repo.git("branch", "-D", "develop");
    const report = await engine.overview();
    expect(report.health).toContainEqual({
      level: "error",
      message: 'base branch "develop" is missing',
    });
  });
});
