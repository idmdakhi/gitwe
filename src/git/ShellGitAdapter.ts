import type { GitAdapter } from "./GitAdapter";
import type { Branch, CreateBranchOptions, MergeOptions, MergeResult } from "../core/types";
import { BranchAlreadyExistsError, BranchNotFoundError, GitCommandError } from "../core/errors";
import { ProcessRunner } from "./ProcessRunner";
import type { Logger } from "../logging/Logger";
import { NoopLogger } from "../logging/Logger";

export class ShellGitAdapter implements GitAdapter {
  private readonly runner: ProcessRunner;

  constructor(
    private readonly cwd: string,
    private readonly logger: Logger = new NoopLogger(),
  ) {
    this.runner = new ProcessRunner();
  }

  private async runGit(args: string[]): Promise<string> {
    const result = await this.runner.run("git", args, this.cwd);
    if (result.exitCode !== 0) {
      throw new GitCommandError(
        `Git command failed: git ${args.join(" ")}`,
        `git ${args.join(" ")}`,
        result.stderr,
      );
    }
    return result.stdout.trim();
  }

  async getCurrentBranch(): Promise<string> {
    const stdout = await this.runGit(["branch", "--show-current"]);
    if (!stdout) throw new Error("Not on a branch (detached HEAD?)");
    return stdout;
  }

  async listBranches(): Promise<Branch[]> {
    const stdout = await this.runGit(["branch", "--format", "%(refname:short)|%(HEAD)"]);
    return stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, head] = line.split("|");
        return { name: name!, isCurrent: head === "*", isRemote: false };
      });
  }

  async branchExists(name: string): Promise<boolean> {
    try {
      await this.runGit(["rev-parse", "--verify", name]);
      return true;
    } catch {
      return false;
    }
  }

  async createBranch(name: string, options: CreateBranchOptions = {}): Promise<void> {
    const { from, checkout = true } = options;
    if (await this.branchExists(name)) throw new BranchAlreadyExistsError(name);

    const args = ["branch"];
    if (from) args.push(from);
    args.push(name);
    await this.runGit(args);

    if (checkout) {
      await this.checkout(name);
    }
  }

  async checkout(name: string): Promise<void> {
    if (!(await this.branchExists(name))) throw new BranchNotFoundError(name);
    await this.runGit(["checkout", name]);
  }

  async merge(source: string, target: string, options: MergeOptions = {}): Promise<MergeResult> {
    if (!(await this.branchExists(source))) throw new BranchNotFoundError(source);
    if (!(await this.branchExists(target))) throw new BranchNotFoundError(target);

    const current = await this.getCurrentBranch();
    if (current !== target) await this.checkout(target);

    // A merge would be a fast-forward iff target's current tip is an ancestor of source's tip.
    const isFastForwardable = await this.runGit(["merge-base", "--is-ancestor", target, source])
      .then(() => true)
      .catch(() => false);

    const args = ["merge"];
    if (options.noFastForward !== false) args.push("--no-ff");
    if (options.message) args.push("-m", options.message);
    args.push(source);

    await this.runGit(args);

    // It only actually fast-forwarded if it was eligible to AND we didn't force --no-ff.
    const fastForward = isFastForwardable && options.noFastForward === false;
    return { source, target, fastForward };
  }

  async deleteBranch(name: string, force = false): Promise<void> {
    if (!(await this.branchExists(name))) throw new BranchNotFoundError(name);
    await this.runGit(["branch", force ? "-D" : "-d", name]);
  }

  async createTag(name: string, message?: string): Promise<void> {
    const args = ["tag"];
    if (message) args.push("-m", message);
    args.push(name);
    await this.runGit(args);
  }

  async push(remote = "origin", branch?: string): Promise<void> {
    const args = ["push", remote];
    if (branch) args.push(branch);
    await this.runGit(args);
  }

  async pull(remote = "origin", branch?: string): Promise<void> {
    const args = ["pull", remote];
    if (branch) args.push(branch);
    await this.runGit(args);
  }

  async getCommitInfo(
    ref: string,
  ): Promise<{ hash: string; date: Date; author: string; message: string }> {
    const stdout = await this.runGit(["log", "-1", "--format=%H|%aI|%an|%s", ref]);
    const [hash, dateIso, author, message] = stdout.split("|");
    return {
      hash: hash!,
      date: new Date(dateIso!),
      author: author!,
      message: message!,
    };
  }

  async getBranchParent(branch: string): Promise<string | undefined> {
    try {
      // Find the first commit shared with main or develop.
      const forkPoint = await this.runGit(["merge-base", branch, "main"]).catch(() =>
        this.runGit(["merge-base", branch, "develop"]),
      );
      if (!forkPoint) return undefined;

      // Prefer a more specific ancestor over main/develop, e.g. a branch this
      // one was actually forked from before it was merged into develop.
      const branches = await this.listBranches();
      const candidates = branches.filter(
        (b) => b.name !== branch && b.name !== "main" && b.name !== "develop",
      );
      for (const candidate of candidates) {
        const isAncestor = await this.runGit([
          "merge-base",
          "--is-ancestor",
          forkPoint,
          candidate.name,
        ])
          .then(() => true)
          .catch(() => false);
        if (isAncestor) return candidate.name;
      }
      return "main"; // Fallback default.
    } catch {
      return undefined;
    }
  }

  async runCommand(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const result = await this.runner.run("git", args, this.cwd);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  }
}
