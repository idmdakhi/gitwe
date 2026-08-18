import { ValidationError } from "../../domain/errors/index.js";
import type { WorkflowService } from "../../domain/services/workflow.service.js";
import type { GitRepository, PushOptions } from "../../domain/ports/git-repository.port.js";
import type { HookRunner } from "../../domain/ports/hook-runner.port.js";
import type { Logger } from "../../domain/ports/logger.port.js";

export interface PublishBranchInput {
  readonly branch: string;
  readonly force?: boolean;
}

/** Pushes a topic branch to every configured remote and sets its upstream. */
export class PublishBranchUseCase {
  constructor(
    private readonly workflow: WorkflowService,
    private readonly git: GitRepository,
    private readonly hooks: HookRunner,
    private readonly logger: Logger,
  ) {}

  async execute(input: PublishBranchInput): Promise<readonly string[]> {
    const resolved = this.workflow.resolveBranch(input.branch);
    if (!resolved) throw new ValidationError(`"${input.branch}" is not a recognised topic branch`);
    if (!(await this.git.branchExists(resolved.branch))) {
      throw new ValidationError(`branch "${resolved.branch}" does not exist locally`);
    }

    const remotes = this.workflow.pushRemotesFor(resolved.type);
    const pushOpts = this.workflow.getPushOptionsFor(resolved.type);

    await this.hooks.run("pre-publish", {
      operation: "pre-publish",
      branch: resolved.branch,
      branchType: resolved.type.name,
      base: resolved.type.base,
      force: input.force === true,
      // Primary remote for scripts that only read GITWE_REMOTE
      remote: remotes[0],
      extra: { remotes: [...remotes], force: input.force === true },
    });

    for (const remote of remotes) {
      if (!(await this.git.remoteExists(remote))) {
        throw new ValidationError(`remote "${remote}" is not configured`);
      }
      this.logger.info(`pushing ${resolved.branch} to ${remote}`);
      await this.git.push(remote, resolved.branch, {
        setUpstream: true,
        force: input.force ? true : undefined,
        forceWithLease: !input.force ? pushOpts.forceWithLease : undefined,
        followTags: pushOpts.followTags,
      } as PushOptions | undefined);
    }

    await this.hooks.run("post-publish", {
      operation: "post-publish",
      branch: resolved.branch,
      branchType: resolved.type.name,
      base: resolved.type.base,
      force: input.force === true,
      remote: remotes[0],
      extra: { remotes: [...remotes], force: input.force === true },
    });
    return remotes;
  }
}
