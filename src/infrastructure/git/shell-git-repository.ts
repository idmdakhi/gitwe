import { Branch } from "#gitwe/domain/entities/branch";
import type {
  GitRepository,
  CreateBranchOptions,
  MergeOptions,
  PushOptions,
  RawCommandResult,
} from "#gitwe/domain/ports/git-repository";
import type { MergeOutcome, CommitInfo, AheadBehind } from "#gitwe/domain/valueObjects/commit-info";
import type { UpdateStrategy } from "#gitwe/domain/valueObjects/merge-strategy";
import { execGit, execGitRaw } from "#gitwe/infrastructure/git/exec-git";
import { GitCommandError } from "#gitwe/infrastructure/git/git-command-error";

const FIELD_SEP = "\x1f";
const RECORD_SEP = "\x00";

/**
 * Default {@link GitRepository} implementation, shelling out to the
 * system `git` binary via `execFile` (never a shell, so branch names or
 * messages containing special characters cannot cause command injection).
 *
 * @public
 */
export class ShellGitRepository implements GitRepository {
  /** @param cwd - Working directory containing the git repository. Defaults to `process.cwd()`. */
  constructor(private readonly cwd: string = process.cwd()) {}

  async getCurrentBranch(): Promise<string> {
    const { stdout } = await execGit(["rev-parse", "--abbrev-ref", "HEAD"], this.cwd);
    return stdout.trim();
  }

  async listBranches(): Promise<Branch[]> {
    const format = `%(refname:short)${FIELD_SEP}%(HEAD)${FIELD_SEP}%(upstream:short)`;
    const [local, remote] = await Promise.all([
      execGit(["for-each-ref", `--format=${format}`, "refs/heads"], this.cwd),
      execGit(["for-each-ref", `--format=${format}`, "refs/remotes"], this.cwd),
    ]);

    const branches: Branch[] = [];
    for (const line of local.stdout.split("\n").filter(Boolean)) {
      const [name, head, upstream] = line.split(FIELD_SEP);
      branches.push(new Branch(name ?? "", head === "*", false, upstream || undefined));
    }
    for (const line of remote.stdout.split("\n").filter(Boolean)) {
      const [name] = line.split(FIELD_SEP);
      if (name?.endsWith("/HEAD")) continue;
      branches.push(new Branch(name ?? "", false, true));
    }
    return branches;
  }

  async branchExists(name: string): Promise<boolean> {
    const result = await execGitRaw(["show-ref", "--verify", "--quiet", `refs/heads/${name}`], this.cwd);
    return result.exitCode === 0;
  }

  async remoteBranchExists(remote: string, name: string): Promise<boolean> {
    const result = await execGitRaw(
      ["show-ref", "--verify", "--quiet", `refs/remotes/${remote}/${name}`],
      this.cwd,
    );
    return result.exitCode === 0;
  }

  async createBranch(name: string, options?: CreateBranchOptions): Promise<void> {
    const from = options?.from;
    const checkout = options?.checkout ?? true;
    const args = checkout ? ["checkout", "-b", name] : ["branch", name];
    if (from) args.push(from);
    await execGit(args, this.cwd);
  }

  async checkout(name: string): Promise<void> {
    await execGit(["checkout", name], this.cwd);
  }

  async createTrackingBranch(name: string, remote: string): Promise<void> {
    await execGit(["checkout", "--track", `${remote}/${name}`], this.cwd);
  }

  async renameBranch(oldName: string, newName: string): Promise<void> {
    await execGit(["branch", "-m", oldName, newName], this.cwd);
  }

  async merge(source: string, target: string, options?: MergeOptions): Promise<MergeOutcome> {
    const current = await this.getCurrentBranch();
    if (current !== target) await this.checkout(target);

    const strategy = options?.strategy ?? "merge";

    if (strategy === "rebase") {
      await this.checkout(source);
      await execGit(["rebase", target], this.cwd);
      await this.checkout(target);
      const { stdout } = await execGit(["merge", "--ff-only", source], this.cwd);
      return { source, target, fastForward: /fast-forward/i.test(stdout) || true };
    }

    const args = ["merge"];
    if (strategy === "squash") {
      args.push("--squash", source);
      await execGit(args, this.cwd);
      const message = options?.message ?? `Squash merge branch '${source}' into ${target}`;
      await execGit(["commit", "-m", message], this.cwd);
      return { source, target, fastForward: false };
    }

    args.push(options?.noFastForward === false ? source : "--no-ff", source);
    if (options?.message) args.push("-m", options.message);
    const { stdout } = await execGit(args, this.cwd);
    return { source, target, fastForward: /fast-forward/i.test(stdout) };
  }

  async rebase(branch: string, onto: string): Promise<void> {
    const current = await this.getCurrentBranch();
    if (current !== branch) await this.checkout(branch);
    await execGit(["rebase", onto], this.cwd);
  }

  async deleteBranch(name: string, force = false): Promise<void> {
    await execGit(["branch", force ? "-D" : "-d", name], this.cwd);
  }

  async deleteRemoteBranch(remote: string, name: string): Promise<void> {
    const result = await execGitRaw(["push", remote, "--delete", name], this.cwd);
    if (result.exitCode !== 0 && !/remote ref does not exist/i.test(result.stderr)) {
      throw new GitCommandError(["push", remote, "--delete", name], result.exitCode, result.stderr);
    }
  }

  async createTag(name: string, message?: string): Promise<void> {
    const args = message ? ["tag", "-a", name, "-m", message] : ["tag", name];
    await execGit(args, this.cwd);
  }

  async fetch(remote = "origin"): Promise<void> {
    await execGit(["fetch", remote], this.cwd);
  }

  async push(remote = "origin", branch?: string, options?: PushOptions): Promise<void> {
    const args = ["push"];
    if (options?.setUpstream) args.push("-u");
    args.push(remote);
    if (branch) args.push(branch);
    if (options?.tags) args.push("--tags");
    await execGit(args, this.cwd);
  }

  async pull(remote = "origin", branch?: string, strategy?: UpdateStrategy): Promise<void> {
    const args = ["pull"];
    if (strategy === "rebase") args.push("--rebase");
    args.push(remote);
    if (branch) args.push(branch);
    await execGit(args, this.cwd);
  }

  async getCommitInfo(ref: string): Promise<CommitInfo> {
    const format = `%H${FIELD_SEP}%aI${FIELD_SEP}%an${FIELD_SEP}%B`;
    const { stdout } = await execGit(["show", "-s", `--format=${format}`, ref], this.cwd);
    return this.parseCommitLine(stdout.trimEnd());
  }

  async getRecentCommits(ref: string, limit = 10): Promise<CommitInfo[]> {
    const format = `%H${FIELD_SEP}%aI${FIELD_SEP}%an${FIELD_SEP}%B`;
    const { stdout } = await execGit(
      ["log", `-n`, String(limit), `-z`, `--format=${format}`, ref],
      this.cwd,
    );
    return stdout
      .split(RECORD_SEP)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => this.parseCommitLine(r));
  }

  private parseCommitLine(line: string): CommitInfo {
    const [hash, date, author, ...rest] = line.split(FIELD_SEP);
    return {
      hash: hash ?? "",
      date: new Date(date ?? 0),
      author: author ?? "",
      message: rest.join(FIELD_SEP).trim(),
    };
  }

  async isMerged(branch: string, into: string): Promise<boolean> {
    const result = await execGitRaw(["merge-base", "--is-ancestor", branch, into], this.cwd);
    return result.exitCode === 0;
  }

  async isWorkingTreeClean(): Promise<boolean> {
    const { stdout } = await execGit(["status", "--porcelain"], this.cwd);
    return stdout.trim() === "";
  }

  async getUpstream(branch: string): Promise<string | undefined> {
    const result = await execGitRaw(
      ["rev-parse", "--abbrev-ref", `${branch}@{upstream}`],
      this.cwd,
    );
    return result.exitCode === 0 ? result.stdout.trim() : undefined;
  }

  async getAheadBehind(branch: string, remote: string): Promise<AheadBehind> {
    const upstreamRef = `${remote}/${branch}`;
    const result = await execGitRaw(
      ["rev-list", "--left-right", "--count", `${branch}...${upstreamRef}`],
      this.cwd,
    );
    if (result.exitCode !== 0) return { ahead: 0, behind: 0 };
    const [ahead, behind] = result.stdout.trim().split(/\s+/).map(Number);
    return { ahead: ahead ?? 0, behind: behind ?? 0 };
  }

  async runRaw(args: string[]): Promise<RawCommandResult> {
    return execGitRaw(args, this.cwd);
  }
}
