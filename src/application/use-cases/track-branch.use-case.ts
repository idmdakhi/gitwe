import { ValidationError } from "../../domain/errors/index.js";
import type { WorkflowService } from "../../domain/services/workflow.service.js";
import type { GitRepository } from "../../domain/ports/git-repository.port.js";
import type { Logger } from "../../domain/ports/logger.port.js";
import { BranchName } from "../../domain/value-objects/branch-name.vo.js";

export interface TrackBranchInput {
  /** Either a full branch name (e.g. "feature/login") or a type+name pair. */
  branchOrType: string;
  /** Optional short name when the first argument is a type. */
  name?: string | undefined;
}

export class TrackBranchUseCase {
  constructor(
    private readonly workflow: WorkflowService,
    private readonly git: GitRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: TrackBranchInput): Promise<{ branch: string; remote: string }> {
    let type, shortName, fullBranch;

    if (input.name !== undefined) {
      // شکل type + name
      type = this.workflow.requireBranchType(input.branchOrType);
      shortName = BranchName.create(input.name).toString();
      fullBranch = this.workflow.branchName(type, shortName);
    } else {
      // شکل نام کامل شاخه
      const resolved = this.workflow.resolveBranch(input.branchOrType);
      if (!resolved) {
        throw new ValidationError(
          `"${input.branchOrType}" is not a recognised topic branch`,
          `available types: ${this.workflow.branchTypes.map((t) => t.name).join(", ")}`,
        );
      }
      type = resolved.type;
      shortName = resolved.shortName;
      fullBranch = resolved.branch;
    }

    if (await this.git.branchExists(fullBranch)) {
      throw new ValidationError(`local branch "${fullBranch}" already exists`);
    }

    const remote = this.workflow.defaultRemote;
    if (!(await this.git.remoteExists(remote))) {
      throw new ValidationError(`remote "${remote}" is not configured`);
    }

    if (!(await this.git.remoteBranchExists(remote, fullBranch))) {
      throw new ValidationError(`remote branch "${remote}/${fullBranch}" does not exist`);
    }

    this.logger.info(`creating local branch ${fullBranch} tracking ${remote}/${fullBranch}`);
    await this.git.createBranch(fullBranch, `${remote}/${fullBranch}`);
    await this.git.checkout(fullBranch);
    await this.git.setUpstream(fullBranch, remote);

    return { branch: fullBranch, remote };
  }
}
