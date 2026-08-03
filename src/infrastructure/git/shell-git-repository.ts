import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

import { ConflictError, GitError } from "../../domain/errors.js";
import type {
  AheadBehind,
  GitRepository,
  MergeOptions,
  PushOptions,
  TagOptions,
} from "../../application/interfaces/git-repository.js";
import { runProcess } from "./process-runner.js";

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
    if (result.exitCode !== 0) {
      const conflicts = await this.conflictedFiles();
      if (conflicts.length > 0) {
        throw new ConflictError(
          `git ${args[0]} stopped on conflicts in: ${conflicts.join(", ")}`,
          conflicts,
        );
      }
      throw new GitError(args, result.exitCode, result.stderr.trim());
    }
    return result.stdout.trim();
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
      throw new GitError(["rebase", "--continue"], result.exitCode, result.stderr.trim());
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
}
