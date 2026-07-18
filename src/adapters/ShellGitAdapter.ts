import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitAdapter } from "./GitAdapter";
import type { Branch, CreateBranchOptions, MergeOptions, MergeResult } from "../core/types";
import { GitCommandError, BranchAlreadyExistsError, BranchNotFoundError } from "../core/errors";
import type { Logger } from "../logging/Logger";
import { NoopLogger } from "../logging/Logger";

const execFileAsync = promisify(execFile);

/**
 * Concrete GitAdapter that talks to the real `git` CLI via child_process.
 * No external git library dependency — just the binary that's already
 * on the machine. Simple, transparent, easy to debug when something
 * goes wrong (the failing command is always in the thrown error).
 */
export class ShellGitAdapter implements GitAdapter {
  constructor(
    private readonly cwd: string = process.cwd(),
    private readonly logger: Logger = new NoopLogger(),
  ) {}

  private async run(args: string[]): Promise<string> {
    this.logger.debug("running git command", { args, cwd: this.cwd });
    try {
      const { stdout } = await execFileAsync("git", args, { cwd: this.cwd });
      return stdout.trim();
    } catch (err) {
      const e = err as { stderr?: string; message: string };
      throw new GitCommandError(
        `git ${args.join(" ")} failed: ${e.message}`,
        `git ${args.join(" ")}`,
        e.stderr ?? "",
      );
    }
  }

  async getCurrentBranch(): Promise<string> {
    return this.run(["rev-parse", "--abbrev-ref", "HEAD"]);
  }

  async listBranches(): Promise<Branch[]> {
    const current = await this.getCurrentBranch();
    const output = await this.run(["branch", "--list", "--format=%(refname:short)"]);
    if (output === "") return [];

    return output.split("\n").map((name) => ({
      name,
      isCurrent: name === current,
      isRemote: false,
    }));
  }

  async branchExists(name: string): Promise<boolean> {
    const branches = await this.listBranches();
    return branches.some((b) => b.name === name);
  }

  async createBranch(name: string, options: CreateBranchOptions = {}): Promise<void> {
    const { from, checkout = true } = options;

    if (await this.branchExists(name)) {
      throw new BranchAlreadyExistsError(name);
    }

    const args = checkout
      ? ["checkout", "-b", name, ...(from ? [from] : [])]
      : ["branch", name, ...(from ? [from] : [])];

    await this.run(args);
    this.logger.info("branch created", { name, from, checkout });
  }

  async checkout(name: string): Promise<void> {
    if (!(await this.branchExists(name))) {
      throw new BranchNotFoundError(name);
    }
    await this.run(["checkout", name]);
  }

  async merge(source: string, target: string, options: MergeOptions = {}): Promise<MergeResult> {
    const { noFastForward = true, message } = options;

    if (!(await this.branchExists(source))) throw new BranchNotFoundError(source);
    if (!(await this.branchExists(target))) throw new BranchNotFoundError(target);

    const current = await this.getCurrentBranch();
    if (current !== target) {
      await this.checkout(target);
    }

    const args = ["merge", source];
    if (noFastForward) args.push("--no-ff");
    if (message) args.push("-m", message);

    await this.run(args);
    this.logger.info("branch merged", { source, target, noFastForward });

    return { source, target, fastForward: !noFastForward };
  }

  async deleteBranch(name: string, force = false): Promise<void> {
    if (!(await this.branchExists(name))) {
      throw new BranchNotFoundError(name);
    }
    await this.run(["branch", force ? "-D" : "-d", name]);
    this.logger.info("branch deleted", { name, force });
  }

  async createTag(name: string, message?: string): Promise<void> {
    const args = ["tag", name];
    if (message) args.push("-m", message);
    await this.run(args);
    this.logger.info("tag created", { name, message });
  }

  async push(remote = "origin", branch?: string): Promise<void> {
    const args = ["push", remote];
    if (branch) args.push(branch);
    await this.run(args);
    this.logger.info("pushed to remote", { remote, branch });
  }

  async pull(remote = "origin", branch?: string): Promise<void> {
    const args = ["pull", remote];
    if (branch) args.push(branch);
    await this.run(args);
    this.logger.info("pulled from remote", { remote, branch });
  }

  async getCommitInfo(ref: string) {
    const output = await this.run(["log", "-1", "--format=%H|%aI|%an|%s", ref]);
    const [hash, date, author, ...messageParts] = output.split("|");
    return {
      hash: hash || "",
      date: new Date(date || ""),
      author: author || "",
      message: messageParts.join("|") || "",
    };
  }

  async getBranchParent(branch: string): Promise<string | undefined> {
    try {
      const output = await this.run(["log", "--decorate", "--format=%D", "--max-count=1", branch]);
      const match = output.match(/origin\/(\S+)|tag:\s*(\S+)/);
      return match ? match[1] || match[2] : undefined;
    } catch {
      return undefined;
    }
  }
}
