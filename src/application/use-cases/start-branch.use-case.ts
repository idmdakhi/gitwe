import { ValidationError } from "../../domain/errors/index.js";
import type { ResolvedBranch } from "../../domain/entities/branch-type.entity.js";
import { BranchName } from "../../domain/value-objects/branch-name.vo.js";
import type { WorkflowService } from "../../domain/services/workflow.service.js";
import type { GitRepository } from "../../domain/ports/git-repository.port.js";
import type { HookRunner } from "../../domain/ports/hook-runner.port.js";
import type { Logger } from "../../domain/ports/logger.port.js";

export interface StartBranchInput {
  readonly typeNameOrAlias: string;
  readonly name: string;
  readonly baseOverride?: string;
  readonly fetch?: boolean;
}

/** Creates a new topic branch off the type's configured (or overridden) base. */
export class StartBranchUseCase {
  constructor(
    private readonly workflow: WorkflowService,
    private readonly git: GitRepository,
    private readonly hooks: HookRunner,
    private readonly logger: Logger,
  ) {}

  async execute(input: StartBranchInput): Promise<ResolvedBranch> {
    const type = this.workflow.requireBranchType(input.typeNameOrAlias);
    const shortName = BranchName.create(input.name).toString();
    const resolved = this.workflow.resolveBranchType(type, shortName);

    const baseName = input.baseOverride
      ? this.workflow.requireBase(input.baseOverride).name
      : type.base;

    if (await this.git.branchExists(resolved.branch)) {
      throw new ValidationError(`branch "${resolved.branch}" already exists`);
    }

    await this.hooks.run("pre-start", { branch: resolved.branch, branchType: type.name, base: baseName });

    if (input.fetch) {
      for (const remote of this.workflow.fetchRemotes()) {
        await this.git.fetch(remote, baseName);
      }
    }

    this.logger.info(`creating ${resolved.branch} from ${baseName}`);
    await this.git.createBranch(resolved.branch, baseName);
    await this.git.checkout(resolved.branch);

    await this.hooks.run("post-start", { branch: resolved.branch, branchType: type.name, base: baseName });

    return resolved;
  }
}
