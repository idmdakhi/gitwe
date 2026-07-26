import type {
  GitRepository,
  CreateBranchOptions,
  MergeOptions,
  RawCommandResult,
} from "#gitwe/domain/ports/GitRepository";
import { Branch } from "#gitwe/domain/entities/Branch";
import { MergeOutcome } from "#gitwe/domain/valueObjects/MergeOutcome";
import { CommitInfo } from "#gitwe/domain/valueObjects/CommitInfo";
import { BranchAlreadyExistsError, BranchNotFoundError } from "#gitwe/domain/errors";
import { GitCommandError } from "#gitwe/infrastructure/git/GitCommandError";
import { ProcessRunner } from "#gitwe/infrastructure/git/ProcessRunner";
import type { Logger } from "#gitwe/shared/logging/Logger";
import { NoopLogger } from "#gitwe/infrastructure/logging/NoopLogger";

/**
 * Talks to the real `git` binary via `ProcessRunner`. This is the only
 * concrete implementation of `GitRepository` in the codebase — earlier
 * iterations had two incompatible interfaces both named `GitRepository`
 * plus a `GitAdapter`; there is now exactly one port and one adapter.
 */
export class ShellGitRepository implements GitRepository {
  private readonly runner = new ProcessRunner();

  constructor(
    private readonly cwd: string,
    private readonly logger: Logger = new NoopLogger(),
  ) {}

  private async runGit(args: string[]): Promise<string> {
    this.logger.debug(`git ${args.join(" ")}`);
    const result = await this.runner.run("git", args, this.cwd);
    if (result.exitCode !== 0) {
      throw new GitCommandError(
        `Git command failed: git ${args.join(" ")}`,
        `git ${args.join(" ")}`,
        result.stderr,
        result.stdout,
      );
    }
    return result.stdout.trim();
  }

  async getCurrentBranch(): Promise<string> {
    const stdout = await this.runGit(["branch", "--show-current"]);
    if (!stdout)
      throw new GitCommandError(
        "Not on a branch (detached HEAD?)",
        "git branch --show-current",
        "",
      );
    return stdout;
  }

  async listBranches(): Promise<Branch[]> {
    const stdout = await this.runGit(["branch", "--format", "%(refname:short)|%(HEAD)"]);
    return stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, head] = line.split("|");
        return new Branch(name!, head === "*", false);
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
    args.push(name);
    if (from) args.push(from);
    await this.runGit(args);

    if (checkout) await this.checkout(name);
  }

  async checkout(name: string): Promise<void> {
    if (!(await this.branchExists(name))) throw new BranchNotFoundError(name);
    await this.runGit(["checkout", name]);
  }

  async merge(source: string, target: string, options: MergeOptions = {}): Promise<MergeOutcome> {
    if (!(await this.branchExists(source))) throw new BranchNotFoundError(source);
    if (!(await this.branchExists(target))) throw new BranchNotFoundError(target);

    const strategy = options.strategy ?? "merge";
    if (strategy === "squash") return this.squashMerge(source, target, options);
    if (strategy === "rebase") return this.rebaseMerge(source, target);
    return this.regularMerge(source, target, options);
  }

  private async regularMerge(
    source: string,
    target: string,
    options: MergeOptions,
  ): Promise<MergeOutcome> {
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
    return MergeOutcome.of(source, target, fastForward);
  }

  private async squashMerge(
    source: string,
    target: string,
    options: MergeOptions,
  ): Promise<MergeOutcome> {
    const current = await this.getCurrentBranch();
    if (current !== target) await this.checkout(target);

    await this.runGit(["merge", "--squash", source]);
    const message = options.message ?? `Squash merge ${source} into ${target}`;
    await this.runGit(["commit", "-m", message]);

    return MergeOutcome.of(source, target, false);
  }

  private async rebaseMerge(source: string, target: string): Promise<MergeOutcome> {
    await this.checkout(source);
    await this.runGit(["rebase", target]);
    await this.checkout(target);
    await this.runGit(["merge", "--ff-only", source]);

    return MergeOutcome.of(source, target, true);
  }

  async rebase(branch: string, onto: string): Promise<void> {
    if (!(await this.branchExists(branch))) throw new BranchNotFoundError(branch);
    if (!(await this.branchExists(onto))) throw new BranchNotFoundError(onto);

    await this.checkout(branch);
    await this.runGit(["rebase", onto]);
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

  async getCommitInfo(ref: string): Promise<CommitInfo> {
    const stdout = await this.runGit(["log", "-1", "--format=%H|%aI|%an|%s", ref]);
    const [hash, dateIso, author, message] = stdout.split("|");
    return { hash: hash!, date: new Date(dateIso!), author: author!, message: message! };
  }

  async getRecentCommits(ref: string, limit = 10): Promise<CommitInfo[]> {
    const stdout = await this.runGit(["log", `-${limit}`, "--format=%H|%aI|%an|%s", ref]);
    if (!stdout) return [];
    return stdout.split("\n").map((line) => {
      const [hash, dateIso, author, message] = line.split("|");
      return { hash: hash!, date: new Date(dateIso!), author: author!, message: message! };
    });
  }

  async isMerged(branch: string, into: string): Promise<boolean> {
    if (!(await this.branchExists(branch))) throw new BranchNotFoundError(branch);
    if (!(await this.branchExists(into))) throw new BranchNotFoundError(into);
    return this.runGit(["merge-base", "--is-ancestor", branch, into])
      .then(() => true)
      .catch(() => false);
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
      return "main";
    } catch {
      return undefined;
    }
  }

  async isWorkingTreeClean(): Promise<boolean> {
    const status = await this.runGit(["status", "--porcelain"]);
    return status.trim().length === 0;
  }

  async runRaw(args: string[]): Promise<RawCommandResult> {
    const result = await this.runner.run("git", args, this.cwd);
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
  }
}
