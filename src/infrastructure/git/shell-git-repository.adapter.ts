import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GitCommandError } from "../../domain/errors/index.js";
import type {
  AheadBehind,
  GitRepository,
  MergeOptions,
  PushOptions,
  TagOptions,
} from "../../domain/ports/git-repository.port.js";

const execFileAsync = promisify(execFile);

/** Real {@link GitRepository} implementation: shells out to the `git` binary. */
export class ShellGitRepository implements GitRepository {
  constructor(readonly cwd: string) {}

  private async run(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync("git", args, { cwd: this.cwd });
      return stdout.trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new GitCommandError(`git ${args.join(" ")} failed: ${message}`);
    }
  }

  private async runOk(args: string[]): Promise<boolean> {
    try {
      await execFileAsync("git", args, { cwd: this.cwd });
      return true;
    } catch {
      return false;
    }
  }

  async currentBranch(): Promise<string | undefined> {
    const name = await this.run(["rev-parse", "--abbrev-ref", "HEAD"]);
    return name === "HEAD" ? undefined : name;
  }

  async listBranches(pattern = "*"): Promise<string[]> {
    const out = await this.run(["for-each-ref", "--format=%(refname:short)", `refs/heads/${pattern}`]);
    return out.length ? out.split("\n") : [];
  }

  async branchExists(branch: string): Promise<boolean> {
    return this.runOk(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]);
  }

  async remoteBranchExists(remote: string, branch: string): Promise<boolean> {
    return this.runOk(["show-ref", "--verify", "--quiet", `refs/remotes/${remote}/${branch}`]);
  }

  async upstreamOf(branch: string): Promise<string | undefined> {
    try {
      return await this.run(["rev-parse", "--abbrev-ref", `${branch}@{upstream}`]);
    } catch {
      return undefined;
    }
  }

  async aheadBehind(ref: string, base: string): Promise<AheadBehind> {
    const out = await this.run(["rev-list", "--left-right", "--count", `${ref}...${base}`]);
    const [ahead = "0", behind = "0"] = out.split(/\s+/);
    return { ahead: Number(ahead), behind: Number(behind) };
  }

  async isAncestor(ancestor: string, descendant: string): Promise<boolean> {
    return this.runOk(["merge-base", "--is-ancestor", ancestor, descendant]);
  }

  async isClean(): Promise<boolean> {
    const out = await this.run(["status", "--porcelain"]);
    return out.length === 0;
  }

  async conflictedFiles(): Promise<string[]> {
    const out = await this.run(["diff", "--name-only", "--diff-filter=U"]);
    return out.length ? out.split("\n") : [];
  }

  async mergeInProgress(): Promise<boolean> {
    return this.runOk(["rev-parse", "--verify", "-q", "MERGE_HEAD"]);
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
    const args = ["merge", branch];
    if (options.noFastForward) args.push("--no-ff");
    if (options.squash) args.push("--squash");
    if (options.message) args.push("-m", options.message);
    await this.run(args);
  }

  async continueMerge(): Promise<void> {
    await this.run(["merge", "--continue"]);
  }

  async abortMerge(): Promise<void> {
    await this.run(["merge", "--abort"]);
  }

  async rebase(onto: string): Promise<void> {
    await this.run(["rebase", onto]);
  }

  async createTag(name: string, options: TagOptions = {}): Promise<void> {
    const args = ["tag"];
    if (options.annotated ?? true) args.push("-a");
    if (options.message) args.push("-m", options.message);
    args.push(name);
    await this.run(args);
  }

  async tagExists(name: string): Promise<boolean> {
    return this.runOk(["show-ref", "--verify", "--quiet", `refs/tags/${name}`]);
  }

  async fetch(remote: string, refspec?: string): Promise<void> {
    const args = ["fetch", remote];
    if (refspec) args.push(refspec);
    await this.run(args);
  }

  async push(remote: string, branch: string, options: PushOptions = {}): Promise<void> {
    const args = ["push", remote];
    if (options.delete) {
      args.push("--delete", branch);
    } else {
      args.push(branch);
      if (options.setUpstream) args.push("--set-upstream");
      if (options.force) args.push("--force-with-lease");
      if (options.followTags) args.push("--follow-tags");
    }
    await this.run(args);
  }

  async remoteExists(remote: string): Promise<boolean> {
    const out = await this.run(["remote"]);
    return out.split("\n").includes(remote);
  }
}
