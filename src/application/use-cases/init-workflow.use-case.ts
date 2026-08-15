import { ConfigError } from "../../domain/errors/index.js";
import type { WorkflowConfig } from "../../domain/entities/workflow-config.entity.js";
import type { ConfigRepository } from "../../domain/ports/config-repository.port.js";
import type { GitRepository } from "../../domain/ports/git-repository.port.js";
import { ConfigValidatorService } from "../../domain/services/config-validator.service.js";
import type { PresetName } from "../../infrastructure/config/presets.js";
import { presets } from "../../infrastructure/config/presets.js";

export interface InitWorkflowInput {
  readonly preset: PresetName;
  readonly force?: boolean;
}

export class InitWorkflowUseCase {
  constructor(
    private readonly configRepo: ConfigRepository,
    private readonly git: GitRepository,
    private readonly validator = new ConfigValidatorService(),
  ) {}

  async execute(input: InitWorkflowInput): Promise<WorkflowConfig> {
    const existing = await this.configRepo.load();
    if (existing && !input.force) {
      throw new ConfigError(
        `a workflow definition already exists at ${this.configRepo.path}`,
        "pass --force to overwrite it",
      );
    }

    const config = presets[input.preset]();
    this.validator.validate(config).assertValid();

    for (const base of config.baseBranches) {
      if (!(await this.git.branchExists(base.name))) {
        const startPoint = base.base ?? "HEAD";
        await this.git.createBranch(base.name, startPoint);
      }
    }

    await this.configRepo.save(config);
    return config;
  }
}
