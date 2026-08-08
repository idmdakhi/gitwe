import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ValidationError } from "../../src/domain/errors.js";
import { TestRepo } from "../support/repo.js";

describe("Engine.start", () => {
  let repo: TestRepo;

  beforeEach(() => {
    repo = TestRepo.create();
  });

  afterEach(() => {
    repo.destroy();
  });

  it("creates a topic branch from the configured start point", async () => {
    const engine = await repo.engine();
    repo.git("checkout", "-q", "develop");
    repo.commit("dev.txt", "dev", "dev only");

    const result = await engine.start("feature", "login");

    expect(result).toEqual({ branch: "feature/login", startPoint: "develop" });
    expect(repo.currentBranch()).toBe("feature/login");
    expect(repo.log()).toContain("dev only");
  });

  it("uses the start point of the topic type, not its parent", async () => {
    const engine = await repo.engine();
    repo.git("checkout", "-q", "develop");
    repo.commit("dev.txt", "dev", "dev only");

    await engine.start("release", "1.0.0");

    expect(repo.currentBranch()).toBe("release/1.0.0");
    expect(repo.log()).toContain("dev only");
  });

  it("accepts an explicit start point", async () => {
    const engine = await repo.engine();
    const result = await engine.start("feature", "from-main", { base: "main" });
    expect(result.startPoint).toBe("main");
  });

  it("refuses to overwrite an existing branch", async () => {
    const engine = await repo.engine();
    await engine.start("feature", "login");
    repo.git("checkout", "-q", "develop");
    await expect(engine.start("feature", "login")).rejects.toThrow(/already exists/);
  });

  it("refuses to run with a dirty working tree", async () => {
    const engine = await repo.engine();
    repo.write("README.md", "dirty");
    await expect(engine.start("feature", "x")).rejects.toThrow(ValidationError);
  });

  it("validates branch names", async () => {
    const engine = await repo.engine();
    await expect(engine.start("feature", "bad name")).rejects.toThrow(/invalid branch name/);
  });
});
