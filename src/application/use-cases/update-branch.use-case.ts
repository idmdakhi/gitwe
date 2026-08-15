import { ConflictError, ValidationError } from "../../domain/errors/index.js";
import type { WorkflowService } from "../../domain/services/workflow.service.js";
import type { GitRepository } from "../../domain/ports/git-repository.port.js";
import type { HookRunner } from "../../domain/ports/hook-runner.port.js";
import type { Logger } from "../../domain/ports/logger.port.js";

export interface UpdateBranchInput {
  readonly branch: string;
  readonly rebase?: boolean;
  readonly fetch?: boolean;
}

/** Brings a topic branch up to date with its base (merge or rebase). */
export class UpdateBranchUseCase {
  constructor(
    private readonly workflow: WorkflowService,
    private readonly git: GitRepository,
    private readonly hooks: HookRunner,
    private readonly logger: Logger,
  ) {}

  async execute(input: UpdateBranchInput): Promise<void> {
    const resolved = this.workflow.resolveBranch(input.branch);
    if (!resolved) throw new ValidationError(`"${input.branch}" is not a recognised topic branch`);

    const base = resolved.type.base;
    await this.hooks.run("pre-update", { branch: resolved.branch, branchType: resolved.type.name, base });

    if (input.fetch) {
      for (const remote of this.workflow.fetchRemotes()) await this.git.fetch(remote, base);
    }

    await this.git.checkout(resolved.branch);
    this.logger.info(`updating ${resolved.branch} from ${base} (${input.rebase ? "rebase" : "merge"})`);

    try {
      if (input.rebase) {
        await this.git.rebase(base);
      } else {
        await this.git.merge(base);
      }
    } catch {
      const conflicts = await this.git.conflictedFiles();
      throw new ConflictError(`conflict updating ${resolved.branch} from ${base}`, conflicts);
    }

    await this.hooks.run("post-update", { branch: resolved.branch, branchType: resolved.type.name, base });
  }
}
