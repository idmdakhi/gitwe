import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { GitTagVersionStore } from "#gitwe/infrastructure/version/GitTagVersionStore";
import { ShellGitRepository } from "#gitwe/infrastructure/git/ShellGitRepository";
import { NoopLogger } from "#gitwe/infrastructure/logging/NoopLogger";
import { Version } from "#gitwe/domain/valueObjects/Version";

function sh(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd });
}

describe("GitTagVersionStore", () => {
  let repoDir: string;
  let git: ShellGitRepository;
  let store: GitTagVersionStore;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "gitwe-test-"));
    sh(repoDir, "init", "-b", "main");
    sh(repoDir, "config", "user.email", "test@example.com");
    sh(repoDir, "config", "user.name", "Test User");
    writeFileSync(join(repoDir, "README.md"), "# test\n");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "-m", "initial commit");

    git = new ShellGitRepository(repoDir, new NoopLogger());
    store = new GitTagVersionStore(git, "v");
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it("returns undefined when no tags exist", async () => {
    const version = await store.resolveCurrent();
    expect(version).toBeUndefined();
  });

  it("returns the highest version from tags", async () => {
    sh(repoDir, "tag", "v1.0.0");
    sh(repoDir, "tag", "v1.2.0");
    sh(repoDir, "tag", "v1.1.5");

    const version = await store.resolveCurrent();
    expect(version?.toString()).toBe("1.2.0");
  });

  it("ignores tags without 'v' prefix", async () => {
    sh(repoDir, "tag", "v1.0.0");
    sh(repoDir, "tag", "1.1.0"); // بدون پیشوند

    const version = await store.resolveCurrent();
    expect(version?.toString()).toBe("1.0.0");
  });

  it("ignores invalid version tags", async () => {
    sh(repoDir, "tag", "v1.0.0");
    sh(repoDir, "tag", "v-invalid");

    const version = await store.resolveCurrent();
    expect(version?.toString()).toBe("1.0.0");
  });

  it("writes a new tag", async () => {
    const version = Version.parse("1.2.3");
    await store.write(version);

    const result = await git.runRaw(["tag", "--list", "v1.2.3"]);
    expect(result.stdout.trim()).toBe("v1.2.3");
  });

  it("creates annotated tag with message", async () => {
    const version = Version.parse("1.2.3");
    await store.write(version);

    const result = await git.runRaw(["tag", "-l", "-n", "v1.2.3"]);
    expect(result.stdout).toContain("v1.2.3");
    expect(result.stdout).toContain("Release v1.2.3");
  });

  it("supports custom prefix", async () => {
    const storeWithPrefix = new GitTagVersionStore(git, "release-");
    const version = Version.parse("1.2.3");
    await storeWithPrefix.write(version);

    const result = await git.runRaw(["tag", "--list", "release-1.2.3"]);
    expect(result.stdout.trim()).toBe("release-1.2.3");
  });
});
