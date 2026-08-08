import { rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Engine } from "../../src/application/engine.js";
import { TestRepo } from "../support/repo.js";

describe("remote-facing operations", () => {
  let repo: TestRepo;
  let remote: string;
  let engine: Engine;

  beforeEach(async () => {
    remote = TestRepo.createBare();
    repo = TestRepo.create();
    repo.git("remote", "add", "origin", remote);
    engine = await repo.engine();
    engine.context.state.clear();
    repo.git("push", "-q", "origin", "main", "develop");
  });

  afterEach(() => {
    repo.destroy();
    rmSync(remote, { recursive: true, force: true });
  });

  it("publishes a topic branch and sets its upstream", async () => {
    await engine.start("feature", "shared");
    repo.commit("a.txt", "a", "shared work");

    const published = await engine.publish(engine.resolve("feature", "shared"));

    expect(published).toBe("origin/feature/shared");
    expect(repo.git("rev-parse", "--abbrev-ref", "feature/shared@{upstream}")).toBe(
      "origin/feature/shared",
    );
  });

  it("tracks a branch published by someone else", async () => {
    await engine.start("feature", "collab");
    repo.commit("a.txt", "a", "collab work");
    await engine.publish(engine.resolve("feature", "collab"));

    const other = TestRepo.create();
    other.git("remote", "add", "origin", remote);
    other.git("fetch", "-q", "origin");
    const otherEngine = await other.engine(undefined, false);

    const branch = await otherEngine.track("feature", "collab");

    expect(branch).toBe("feature/collab");
    expect(other.currentBranch()).toBe("feature/collab");
    expect(other.log()).toContain("collab work");
    other.destroy();
  });

  it("deletes the remote branch when finishing", async () => {
    await engine.start("feature", "published");
    repo.commit("a.txt", "a", "published work");
    await engine.publish(engine.resolve("feature", "published"));

    const result = await engine.finish(engine.resolve("feature", "published"), {
      push: true,
      interactive: false,
    });

    expect(result.deletedRemote).toBe(true);
    expect(repo.git("ls-remote", "--heads", "origin", "feature/published")).toBe("");
    expect(repo.git("log", "--oneline", "--format=%s", "origin/develop")).toContain(
      "published work",
    );
  });

  it("refuses to finish a branch that is behind its remote", async () => {
    await engine.start("feature", "behind");
    repo.commit("a.txt", "a", "local work");
    await engine.publish(engine.resolve("feature", "behind"));

    // Someone else pushes another commit to the same branch.
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
