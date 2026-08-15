import { existsSync } from "node:fs";
import { join } from "node:path";
import { ConflictError, GitCommandError } from "../../domain/errors/index.js";
import type {
  AheadBehind,
  GitRepository,
  MergeOptions,
  PushOptions,
  TagOptions,
} from "../../domain/ports/git-repository.port.js";
import { runProcess } from "./process-runner.js";

export interface ShellGitOptions {
  readonly cwd: string;
  /** Optional tracer for every git argv (CLI `--verbose`). */
  readonly trace?: (args: string[]) => void;
}

/**
 * Real {@link GitRepository}: shells out to the `git` binary on PATH.
 *
 * Conflict-aware: merge/rebase failures that leave the repo in a conflict
 * state throw {@link ConflictError} so finish can persist and resume.
 * Version bumping and package.json I/O do **not** belong here — use
 * {@link VersionCalculatorService} and application use cases.
 */
export class ShellGitRepository implements GitRepository {
  readonly cwd: string;
  private readonly trace?: (args: string[]) => void;

  constructor(cwdOrOptions: string | ShellGitOptions) {
    if (typeof cwdOrOptions === "string") {
      this.cwd = cwdOrOptions;
    } else {
      this.cwd = cwdOrOptions.cwd;
      this.trace = cwdOrOptions.trace;
    }
  }

  private async exec(
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    this.trace?.(args);
    return runProcess("git", args, { cwd: this.cwd });
  }

  /** Run git; throw ConflictError or GitCommandError on failure. */
  private async run(args: string[]): Promise<string> {
    const result = await this.exec(args);
    if (result.exitCode === 0) {
      return result.stdout.trim();
    }

    const conflicts = await this.conflictedFiles();
    const mergeActive = await this.mergeInProgress();
    const rebaseActive = await this.rebaseInProgress();
    const looksLikeConflict =
      result.exitCode === 2 ||
      mergeActive ||
      rebaseActive ||
      conflicts.length > 0 ||
      /conflict/i.test(result.stderr);

    if (looksLikeConflict) {
      throw new ConflictError(
        conflicts.length > 0
          ? `git ${args[0]} stopped on conflicts in: ${conflicts.join(", ")}`
          : `git ${args[0]} stopped on a conflict`,
        conflicts,
      );
    }

    throw new GitCommandError(`git ${args.join(" ")} failed`, result.stderr.trim() || undefined);
  }

  private async ok(args: string[]): Promise<boolean> {
    const result = await this.exec(args);
    return result.exitCode === 0;
  }

  private async gitDir(): Promise<string> {
    const result = await this.exec(["rev-parse", "--absolute-git-dir"]);
    if (result.exitCode !== 0) {
      throw new GitCommandError("not a git repository", result.stderr.trim() || undefined);
    }
    return result.stdout.trim();
  }

  async rebaseInProgress(): Promise<boolean> {
    try {
      const dir = await this.gitDir();
      return existsSync(join(dir, "rebase-merge")) || existsSync(join(dir, "rebase-apply"));
    } catch {
      return false;
    }
  }

  async currentBranch(): Promise<string | undefined> {
    const result = await this.exec(["symbolic-ref", "--quiet", "--short", "HEAD"]);
    if (result.exitCode !== 0) return undefined;
    const branch = result.stdout.trim();
    return branch === "" ? undefined : branch;
  }

  async listBranches(pattern = "*"): Promise<string[]> {
    const out = await this.run([
      "for-each-ref",
      "--format=%(refname:short)",
      `refs/heads/${pattern}`,
    ]);
    return out.length ? out.split("\n") : [];
  }

  async branchExists(branch: string): Promise<boolean> {
    return this.ok(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]);
  }

  async remoteBranchExists(remote: string, branch: string): Promise<boolean> {
    return this.ok(["show-ref", "--verify", "--quiet", `refs/remotes/${remote}/${branch}`]);
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
    // left = base, right = ref  →  behind, ahead  (matches common "how far is ref from base")
    const out = await this.run(["rev-list", "--left-right", "--count", `${base}...${ref}`]);
    const [behind = "0", ahead = "0"] = out.split(/\s+/);
    return { ahead: Number(ahead) || 0, behind: Number(behind) || 0 };
  }

  async isAncestor(ancestor: string, descendant: string): Promise<boolean> {
    return this.ok(["merge-base", "--is-ancestor", ancestor, descendant]);
  }

  /** Only tracked changes block operations; untracked files are ignored. */
  async isClean(): Promise<boolean> {
    const out = await this.run(["status", "--porcelain", "--untracked-files=no"]);
    return out.length === 0;
  }

  async conflictedFiles(): Promise<string[]> {
    const result = await this.exec(["diff", "--name-only", "--diff-filter=U"]);
    if (result.exitCode !== 0) return [];
    const out = result.stdout.trim();
    return out.length ? out.split("\n") : [];
  }

  async mergeInProgress(): Promise<boolean> {
    try {
      const dir = await this.gitDir();
      return existsSync(join(dir, "MERGE_HEAD"));
    } catch {
      return false;
    }
  }

  async createBranch(branch: string, startPoint: string): Promise<void> {
    await this.run(["branch", branch, startPoint]);
  }

  async checkout(branch: string): Promise<void> {
    await this.run(["checkout", branch]);
  }

  async deleteBranch(branch: string, force = false): Promise<void> {
    await this.run(["branch", force ? "-D" : "-d", branch]);
  }

  async deleteRemoteBranch(remote: string, branch: string): Promise<void> {
    await this.run(["push", remote, "--delete", branch]);
  }

  async renameBranch(from: string, to: string): Promise<void> {
    await this.run(["branch", "-m", from, to]);
  }

  async merge(branch: string, options: MergeOptions = {}): Promise<void> {
    const args = ["merge"];
    if (options.squash) {
      args.push("--squash");
    } else if (options.noFastForward) {
      args.push("--no-ff");
    }
    if (options.message) args.push("-m", options.message);
    args.push(branch);
    await this.run(args);
  }

  async continueMerge(): Promise<void> {
    await this.run(["merge", "--continue"]);
  }

  async abortMerge(): Promise<void> {
    await this.exec(["merge", "--abort"]);
  }

  async rebase(onto: string): Promise<void> {
    await this.run(["rebase", onto]);
  }

  async createTag(name: string, options: TagOptions = {}): Promise<void> {
    const args = ["tag"];
    if (options.annotated ?? true) args.push("-a");
    if (options.message) args.push("-m", options.message);
    else if (options.annotated ?? true) args.push("-m", name);
    args.push(name);
    await this.run(args);
  }

  async tagExists(name: string): Promise<boolean> {
    return this.ok(["show-ref", "--verify", "--quiet", `refs/tags/${name}`]);
  }

  async fetch(remote: string, refspec?: string): Promise<void> {
    const args = ["fetch", remote];
    if (refspec) args.push(refspec);
    await this.run(args);
  }

  async push(remote: string, branch: string, options: PushOptions = {}): Promise<void> {
    const args = ["push"];
    if (options.setUpstream) args.push("--set-upstream");
    if (options.force) args.push("--force-with-lease");
    if (options.followTags) args.push("--follow-tags");
    if (options.delete) {
      args.push("--delete", remote, branch);
    } else {
      args.push(remote, branch);
    }
    await this.run(args);
  }

  async remoteExists(remote: string): Promise<boolean> {
    const out = await this.run(["remote"]);
    return out.split("\n").includes(remote);
  }
}
