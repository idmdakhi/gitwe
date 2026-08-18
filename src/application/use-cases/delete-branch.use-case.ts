import { ValidationError } from "../../domain/errors/index.js";
import type { WorkflowService } from "../../domain/services/workflow.service.js";
import type { GitRepository } from "../../domain/ports/git-repository.port.js";
import type { HookRunner } from "../../domain/ports/hook-runner.port.js";

export interface DeleteBranchInput {
  readonly branch: string;
  readonly force?: boolean;
  readonly remote?: boolean;
}

export class DeleteBranchUseCase {
  constructor(
    private readonly workflow: WorkflowService,
    private readonly git: GitRepository,
    private readonly hooks: HookRunner,
  ) {}

  async execute(input: DeleteBranchInput): Promise<void> {
    const resolved = this.workflow.resolveBranch(input.branch);
    if (!resolved) throw new ValidationError(`"${input.branch}" is not a recognised topic branch`);
    if (this.workflow.isProtected(resolved.branch)) {
      throw new ValidationError(`"${resolved.branch}" is protected and cannot be deleted`);
    }

    await this.hooks.run("pre-delete", {
      operation: "pre-delete",
      branch: resolved.branch,
      branchType: resolved.type.name,
      base: resolved.type.base,
      force: input.force === true,
      extra: { remote: input.remote === true, force: input.force === true },
    });

    const current = await this.git.currentBranch();
    if (current === resolved.branch) {
      await this.git.checkout(resolved.type.base);
    }
    await this.git.deleteBranch(resolved.branch, input.force ?? false);

    const deletedRemotes: string[] = [];
    if (input.remote) {
      for (const remote of this.workflow.pushRemotesFor(resolved.type)) {
        if (await this.git.remoteBranchExists(remote, resolved.branch)) {
          await this.git.deleteRemoteBranch(remote, resolved.branch);
          deletedRemotes.push(remote);
        }
      }
    }

    await this.hooks.run("post-delete", {
      operation: "post-delete",
      branch: resolved.branch,
      branchType: resolved.type.name,
      base: resolved.type.base,
      force: input.force === true,
      extra: {
        remote: input.remote === true,
        force: input.force === true,
        deletedRemotes,
        deleted: true,
      },
    });
  }
}
