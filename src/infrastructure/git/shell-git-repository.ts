import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { ConflictError, GitError } from "../../domain/errors.js";
import type {
  AheadBehind,
  GitRepository,
  MergeOptions,
  PushOptions,
  TagOptions,
} from "../../application/interfaces/git-repository.js";
import { runProcess } from "./process-runner.js";
import yaml from "js-yaml";

export interface ShellGitOptions {
  cwd: string;
  /** Log every git invocation. */
  trace?: (args: string[]) => void;
}

/** {@link GitRepository} backed by the `git` binary on PATH. */
export class ShellGitRepository implements GitRepository {
  readonly cwd: string;
  private readonly trace?: (args: string[]) => void;

  constructor(options: ShellGitOptions) {
    this.cwd = options.cwd;
    this.trace = options.trace;
  }

  private async exec(
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    this.trace?.(args);
    return runProcess("git", args, { cwd: this.cwd });
  }

  private async run(args: string[]): Promise<string> {
    const result = await this.exec(args);

    // اگر دستور با موفقیت اجرا شد، خروجی را برگردان
    if (result.exitCode === 0) {
      return result.stdout.trim();
    }

    // ===== تشخیص Conflict =====
    // ۱. اگر کد خروجی ۲ باشد (معمولاً conflict در Git)
    if (result.exitCode === 2) {
      const conflicts = await this.conflictedFiles();
      throw new ConflictError(
        conflicts.length > 0
          ? `git ${args[0]} stopped on conflicts in: ${conflicts.join(", ")}`
          : `git ${args[0]} stopped on a conflict`,
        conflicts,
      );
    }

    // ۲. اگر عملیات merge/rebase در حال انجام است یا stderr شامل "conflict" است
    const mergeInProgress = await this.mergeInProgress();
    const rebaseInProgress = await this.rebaseInProgress();
    if (mergeInProgress || rebaseInProgress || result.stderr.toLowerCase().includes("conflict")) {
      const conflicts = await this.conflictedFiles();
      throw new ConflictError(
        conflicts.length > 0
          ? `git ${args[0]} stopped on conflicts in: ${conflicts.join(", ")}`
          : `git ${args[0]} stopped on a conflict`,
        conflicts,
      );
    }

    // ۳. در غیر این صورت، خطای عمومی Git
    throw new GitError(`git ${args.join(" ")} failed`, result.stderr.trim() || undefined);
  }

  private async ok(args: string[]): Promise<boolean> {
    const result = await this.exec(args);
    return result.exitCode === 0;
  }

  raw(args: string[]): Promise<string> {
    return this.run(args);
  }

  async root(): Promise<string> {
    const out = await this.run(["rev-parse", "--show-toplevel"]);
    return resolve(out);
  }

  async gitDir(): Promise<string> {
    const dir = await this.run(["rev-parse", "--absolute-git-dir"]);
    return isAbsolute(dir) ? resolve(dir) : resolve(this.cwd, dir);
  }

  async currentBranch(): Promise<string | undefined> {
    const result = await this.exec(["symbolic-ref", "--quiet", "--short", "HEAD"]);
    if (result.exitCode !== 0) return undefined;
    const branch = result.stdout.trim();
    return branch === "" ? undefined : branch;
  }

  async listBranches(): Promise<string[]> {
    const out = await this.run(["for-each-ref", "--format=%(refname:short)", "refs/heads"]);
    return out === "" ? [] : out.split("\n");
  }

  async listRemoteBranches(remote: string): Promise<string[]> {
    const out = await this.run([
      "for-each-ref",
      "--format=%(refname:short)",
      `refs/remotes/${remote}`,
    ]);
    if (out === "") return [];
    return out
      .split("\n")
      .map((ref) => ref.slice(remote.length + 1))
      .filter((branch) => branch !== "" && branch !== "HEAD");
  }

  branchExists(branch: string): Promise<boolean> {
    return this.ok(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]);
  }

  remoteBranchExists(remote: string, branch: string): Promise<boolean> {
    return this.ok(["show-ref", "--verify", "--quiet", `refs/remotes/${remote}/${branch}`]);
  }

  revParse(ref: string): Promise<string> {
    return this.run(["rev-parse", "--verify", `${ref}^{commit}`]);
  }

  refExists(ref: string): Promise<boolean> {
    return this.ok(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
  }

  async upstreamOf(branch: string): Promise<string | undefined> {
    const result = await this.exec([
      "rev-parse",
      "--abbrev-ref",
      "--symbolic-full-name",
      `${branch}@{upstream}`,
    ]);
    if (result.exitCode !== 0) return undefined;
    const upstream = result.stdout.trim();
    return upstream === "" ? undefined : upstream;
  }

  async aheadBehind(ref: string, base: string): Promise<AheadBehind> {
    const out = await this.run(["rev-list", "--left-right", "--count", `${base}...${ref}`]);
    const [behind, ahead] = out.split(/\s+/).map((value) => Number.parseInt(value, 10));
    return { ahead: ahead || 0, behind: behind || 0 };
  }

  isAncestor(ancestor: string, descendant: string): Promise<boolean> {
    return this.ok(["merge-base", "--is-ancestor", ancestor, descendant]);
  }

  /** Untracked files never block an operation; only tracked changes do. */
  async isClean(): Promise<boolean> {
    const out = await this.run(["status", "--porcelain", "--untracked-files=no"]);
    return out === "";
  }

  async conflictedFiles(): Promise<string[]> {
    const result = await this.exec(["diff", "--name-only", "--diff-filter=U"]);
    if (result.exitCode !== 0) return [];
    const out = result.stdout.trim();
    return out === "" ? [] : out.split("\n");
  }

  async mergeInProgress(): Promise<boolean> {
    return existsSync(join(await this.gitDir(), "MERGE_HEAD"));
  }
  // and in isConflictState: exec(["ls-files", "--unmerged"]) as above

  async rebaseInProgress(): Promise<boolean> {
    const dir = await this.gitDir();
    return existsSync(join(dir, "rebase-merge")) || existsSync(join(dir, "rebase-apply"));
  }

  hasCommits(): Promise<boolean> {
    return this.ok(["rev-parse", "--verify", "--quiet", "HEAD"]);
  }

  async createBranch(branch: string, startPoint: string): Promise<void> {
    await this.run(["branch", branch, startPoint]);
  }

  async checkout(branch: string): Promise<void> {
    await this.run(["checkout", branch]);
  }

  async deleteBranch(branch: string, force: boolean): Promise<void> {
    await this.run(["branch", force ? "-D" : "-d", branch]);
  }

  async renameBranch(from: string, to: string): Promise<void> {
    await this.run(["branch", "-m", from, to]);
  }

  async createTrackingBranch(branch: string, remote: string): Promise<void> {
    await this.run(["branch", "--track", branch, `${remote}/${branch}`]);
  }

  async setUpstream(branch: string, remote: string): Promise<void> {
    await this.run(["branch", `--set-upstream-to=${remote}/${branch}`, branch]);
  }

  async resetHard(ref: string): Promise<void> {
    await this.run(["reset", "--hard", ref]);
  }

  async merge(branch: string, options: MergeOptions = {}): Promise<void> {
    const args = ["merge"];
    if (options.squash === true) args.push("--squash");
    else args.push(options.noFf === true ? "--no-ff" : "--no-edit");
    if (options.noVerify === true) args.push("--no-verify");
    if (options.message !== undefined && options.squash !== true) {
      args.push("-m", options.message);
    }
    args.push(branch);
    await this.run(args);
  }

  async abortMerge(): Promise<void> {
    await this.exec(["merge", "--abort"]);
  }

  async rebase(onto: string): Promise<void> {
    await this.run(["rebase", onto]);
  }

  async abortRebase(): Promise<void> {
    await this.exec(["rebase", "--abort"]);
  }

  async continueRebase(): Promise<void> {
    this.trace?.(["rebase", "--continue"]);
    const result = await runProcess("git", ["rebase", "--continue"], {
      cwd: this.cwd,
      env: { ...process.env, GIT_EDITOR: "true" },
    });
    if (result.exitCode !== 0) {
      throw new GitError("git rebase --continue failed", result.stderr.trim() || undefined);
    }
  }

  async commit(message: string, options: { noVerify?: boolean } = {}): Promise<void> {
    const args = ["commit", "-m", message];
    if (options.noVerify === true) args.push("--no-verify");
    await this.run(args);
  }

  async hasStagedChanges(): Promise<boolean> {
    const result = await this.exec(["diff", "--cached", "--quiet"]);
    return result.exitCode !== 0;
  }

  async tags(): Promise<string[]> {
    const out = await this.run(["tag", "--list"]);
    return out === "" ? [] : out.split("\n");
  }

  async createTag(name: string, options: TagOptions = {}): Promise<void> {
    const args = ["tag"];
    if (options.sign) {
      args.push("-s");
      if (options.signingKey) args.push("-u", options.signingKey);
    } else args.push("-a");
    args.push("-m", options.message ?? name, name);
    if (options.ref) args.push(options.ref);
    await this.run(args);
  }

  async deleteTag(name: string): Promise<void> {
    await this.run(["tag", "-d", name]);
  }

  async fetch(remote: string, refspec?: string): Promise<void> {
    const args = ["fetch", remote];
    if (refspec !== undefined) args.push(refspec);
    await this.run(args);
  }

  async push(remote: string, branch: string, options: PushOptions = {}): Promise<void> {
    const args = ["push"];
    if (options.setUpstream === true) args.push("--set-upstream");
    if (options.force === true) args.push("--force-with-lease");
    if (options.followTags === true) args.push("--follow-tags");
    if (options.delete === true) args.push("--delete");
    for (const option of options.pushOptions ?? []) args.push(`--push-option=${option}`);
    args.push(remote, branch);
    await this.run(args);
  }

  async remoteExists(remote: string): Promise<boolean> {
    const out = await this.run(["remote"]);
    return out.split("\n").includes(remote);
  }

  /**
   * خواندن نسخه از package.json
   */
  async getPackageVersion(): Promise<string> {
    const pkgPath = resolve(this.cwd, "package.json");
    if (!existsSync(pkgPath)) {
      return "0.0.0";
    }
    try {
      const content = readFileSync(pkgPath, "utf8");
      const pkg = JSON.parse(content);
      return pkg.version || "0.0.0";
    } catch {
      return "0.0.0";
    }
  }

  /**
   * خواندن نسخه از VERSION.yaml
   */
  async getVersionFromYaml(yamlPath: string): Promise<string> {
    if (!existsSync(yamlPath)) {
      return "0.0.0";
    }
    try {
      const content = readFileSync(yamlPath, "utf8");
      const data = yaml.load(content) as { version?: string };
      return data?.version || "0.0.0";
    } catch {
      return "0.0.0";
    }
  }

  /**
   * بروزرسانی نسخه در VERSION.yaml
   */
  async setVersionInYaml(yamlPath: string, newVersion: string): Promise<void> {
    try {
      // اطمینان از وجود دایرکتوری
      const dir = dirname(yamlPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // اگر فایل وجود ندارد، یک فایل پیش‌فرض ایجاد کن
      if (!existsSync(yamlPath)) {
        const defaultContent = {
          version: "0.1.0",
          tagPrefix: "v",
          format: "{{tagPrefix}}{{major}}.{{minor}}.{{patch}}",
          tag: ["hotfix", "release"],
          bumpRules: {
            major: [],
            minor: ["feature", "release"],
            patch: ["hotfix"],
          },
          autoCommit: true,
          commitMessage: "chore: bump version to {{version}}",
        };
        writeFileSync(yamlPath, yaml.dump(defaultContent), "utf8");
      }

      // خواندن و به‌روزرسانی
      const content = readFileSync(yamlPath, "utf8");
      const data = yaml.load(content) as Record<string, unknown>;
      data.version = newVersion;
      writeFileSync(yamlPath, yaml.dump(data, { lineWidth: 100, noRefs: true }), "utf8");
    } catch (error) {
      throw new Error(`Failed to update version in ${yamlPath}: ${(error as Error).message}`);
    }
  }

  async setPackageVersion(version: string): Promise<void> {
    const packagePath = resolve(this.cwd, "package.json");
    if (!existsSync(packagePath)) {
      throw new Error("package.json not found");
    }
    const content = readFileSync(packagePath, "utf8");
    const packageJson = JSON.parse(content);
    packageJson.version = version;
    writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  }
  /**
   * پارس کردن نسخه به اجزاء
   */
  parseVersion(
    version: string,
  ): { major: number; minor: number; patch: number; prerelease?: string } | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) return null;
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
    };
  }

  /**
   * افزایش نسخه بر اساس نوع bump
   */
  bumpVersion(version: string, bumpType: "major" | "minor" | "patch" | "prerelease"): string {
    const parsed = this.parseVersion(version);
    if (!parsed) return "0.1.0";

    let { major, minor, patch, prerelease } = parsed;

    if (bumpType === "major") {
      major += 1;
      minor = 0;
      patch = 0;
      prerelease = undefined;
    } else if (bumpType === "minor") {
      minor += 1;
      patch = 0;
      prerelease = undefined;
    } else if (bumpType === "patch") {
      patch += 1;
      prerelease = undefined;
    } else if (bumpType === "prerelease") {
      const parts = prerelease ? prerelease.split(".") : [];
      const type = parts[0] || "alpha";
      const number = parts.length > 1 ? parseInt(parts[1], 10) + 1 : 1;
      prerelease = `${type}.${number}`;
    }

    const base = `${major}.${minor}.${patch}`;
    return prerelease ? `${base}-${prerelease}` : base;
  }

  /**
   * تولید نام تگ با استفاده از قالب
   */
  renderTagName(
    format: string,
    versionObj: {
      tagPrefix: string;
      major: number;
      minor: number;
      patch: number;
      prerelease?: string;
    },
  ): string {
    // پردازش شرط
    let result = format.replace(/{{#if prerelease}}(.*?){{\/if}}/g, (_, content) =>
      versionObj.prerelease ? content : "",
    );
    // جایگزینی متغیرها
    result = result.replace(/\{\{tagPrefix\}\}/g, versionObj.tagPrefix);
    result = result.replace(/\{\{major\}\}/g, String(versionObj.major));
    result = result.replace(/\{\{minor\}\}/g, String(versionObj.minor));
    result = result.replace(/\{\{patch\}\}/g, String(versionObj.patch));
    result = result.replace(/\{\{prerelease\}\}/g, versionObj.prerelease ?? "");
    return result;
  }

  /**
   * بررسی وجود تگ
   */
  async tagExists(tagName: string): Promise<boolean> {
    const tags = await this.tags();
    return tags.includes(tagName);
  }

  async cherryPickRange(base: string, topic: string): Promise<void> {
    // compute merge-base
    const mergeBase = await this.run(["merge-base", base, topic]);
    const range = `${mergeBase.trim()}..${topic}`;
    await this.run(["cherry-pick", range]);
  }

  async cherryPickAbort(): Promise<void> {
    await this.exec(["cherry-pick", "--abort"]);
  }
}
