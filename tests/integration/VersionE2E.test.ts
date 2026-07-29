import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ShellGitRepository } from "#gitwe/infrastructure/git/ShellGitRepository";
import { NoopLogger } from "#gitwe/infrastructure/logging/NoopLogger";
import { VersionService } from "#gitwe/application/services/VersionService";
import { GitTagVersionStore } from "#gitwe/infrastructure/version/GitTagVersionStore";
import { PackageJsonVersionStore } from "#gitwe/infrastructure/version/PackageJsonVersionStore";
import { CompositeVersionStore } from "#gitwe/infrastructure/version/CompositeVersionStore";
import { ConventionalChangelogWriter } from "#gitwe/infrastructure/version/ConventionalChangelogWriter";
// import { Version } from "#gitwe/domain/valueObjects/Version";

function sh(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "pipe", encoding: "utf-8" });
}

describe("Version E2E", () => {
  let repoDir: string;
  let git: ShellGitRepository;
  let service: VersionService;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "gitwe-e2e-"));
    sh(repoDir, "init", "-b", "main");
    sh(repoDir, "config", "user.email", "test@example.com");
    sh(repoDir, "config", "user.name", "Test User");
    sh(repoDir, "config", "commit.gpgsign", "false");
    sh(repoDir, "config", "tag.gpgsign", "false");

    const pkgPath = join(repoDir, "package.json");
    writeFileSync(pkgPath, JSON.stringify({ name: "test", version: "1.0.0" }));

    writeFileSync(join(repoDir, "README.md"), "# test\n");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "--no-gpg-sign", "-m", "initial commit");
    sh(repoDir, "tag", "-a", "v1.0.0", "-m", "Release v1.0.0");

    git = new ShellGitRepository(repoDir, new NoopLogger());

    const tagStore = new GitTagVersionStore(git, "v");
    const pkgStore = new PackageJsonVersionStore(pkgPath);
    const composite = new CompositeVersionStore([tagStore, pkgStore], "highest");
    const changelog = new ConventionalChangelogWriter(git, new NoopLogger());

    service = new VersionService({
      stores: [composite],
      git,
      changelogWriter: changelog,
      logger: new NoopLogger(),
      requireCleanTree: true,
      tagPrefix: "v",
    });
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it("resolves current version from git tag", async () => {
    const version = await service.resolveCurrent();
    expect(version?.toString()).toBe("1.0.0");
  });

  it("bumps patch and creates tag", async () => {
    const result = await service.bump("patch");
    expect(result.next.toString()).toBe("1.0.1");
    expect(result.tag).toBe("v1.0.1");

    const tags = await git.runRaw(["tag", "--list"]);
    expect(tags.stdout).toContain("v1.0.1");
  });

  it("bumps minor and creates CHANGELOG", async () => {
    writeFileSync(join(repoDir, "file.txt"), "content");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "--no-gpg-sign", "-m", "feat: add new file");

    await service.bump("minor");

    const changelogPath = join(repoDir, "CHANGELOG.md");
    const changelogContent = readFileSync(changelogPath, "utf-8");
    expect(changelogContent).toContain("## [1.1.0]");
    expect(changelogContent).toContain("🚀 Features");
    expect(changelogContent).toContain("add new file");
  });

  it("bumps prerelease with incrementing numbers", async () => {
    const result1 = await service.bump("prerelease", "beta");
    expect(result1.next.toString()).toBe("1.0.0-beta.1");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "--no-gpg-sign", "-m", "chore: bump prerelease");

    const result2 = await service.bump("prerelease", "beta");
    expect(result2.next.toString()).toBe("1.0.0-beta.2");
  });

  it("resets prerelease on stable bump", async () => {
    await service.bump("prerelease", "beta");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "--no-gpg-sign", "-m", "chore: bump prerelease");

    const result = await service.bump("patch");
    expect(result.next.toString()).toBe("1.0.1");
    expect(result.next.isPrerelease()).toBe(false);
  });

  it("bumps to major and resets minor and patch", async () => {
    await service.bump("major");
    const version = await service.resolveCurrent();
    expect(version?.toString()).toBe("2.0.0");
  });

  it("reads from package.json after write", async () => {
    await service.bump("patch");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "--no-gpg-sign", "-m", "chore: bump patch");

    await service.bump("patch");
    sh(repoDir, "add", ".");
    sh(repoDir, "commit", "--no-gpg-sign", "-m", "chore: bump patch");

    const version = await service.resolveCurrent();
    expect(version?.toString()).toBe("1.0.2");
  });

  it("rejects when working tree is dirty", async () => {
    writeFileSync(join(repoDir, "dirty.txt"), "dirty");
    await expect(service.bump("patch")).rejects.toThrow(/Working tree has uncommitted changes/);
  });

  it("resolves version from package.json when no tags exist", async () => {
    const tags = await git.runRaw(["tag", "--list"]);
    for (const tag of tags.stdout.split("\n").filter(Boolean)) {
      sh(repoDir, "tag", "-d", tag);
    }

    const version = await service.resolveCurrent();
    expect(version?.toString()).toBe("1.0.0");
  });
});
