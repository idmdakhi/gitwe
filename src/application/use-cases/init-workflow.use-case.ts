import { ConfigError } from "../../domain/errors/index.js";
import type { WorkflowConfig } from "../../domain/entities/workflow-config.entity.js";
import type { ConfigRepository } from "../../domain/ports/config-repository.port.js";
import type { GitRepository } from "../../domain/ports/git-repository.port.js";
import { ConfigValidatorService } from "../../domain/services/config-validator.service.js";
import { presets, type PresetName } from "../../domain/config/presets.js";
import { HookRunner } from "../../domain/ports/hook-runner.port.js";

export interface InitWorkflowInput {
  /** Start from this preset when `config` is not provided. */
  readonly preset?: PresetName | undefined;
  /** Fully built config (e.g. from the interactive wizard). Takes precedence over preset. */
  readonly config?: WorkflowConfig | undefined;
  readonly force?: boolean | undefined;
  /** When false, skip creating missing base branches. Default true. */
  readonly createBranches?: boolean | undefined;
}

export class InitWorkflowUseCase {
  constructor(
    private readonly configRepo: ConfigRepository,
    private readonly git: GitRepository,
    private readonly hooks: HookRunner,
    private readonly validator = new ConfigValidatorService(),
  ) {}

  async execute(input: InitWorkflowInput): Promise<WorkflowConfig> {
    await this.hooks.run("pre-init", {
      operation: "pre-init",
      force: input.force === true,
      extra: {
        preset: input.preset,
        force: input.force === true,
        createBranches: input.createBranches !== false,
      },
    });

    const existing = await this.configRepo.load();
    if (existing && !input.force) {
      throw new ConfigError(
        `a workflow definition already exists at ${this.configRepo.path}`,
        "pass --force to overwrite it",
      );
    }

    const config = input.config ?? (input.preset ? presets[input.preset]() : undefined);
    if (!config) {
      throw new ConfigError(
        "init requires a preset or an explicit workflow config",
        "pass --preset classic|github|gitlab or use the interactive wizard",
      );
    }

    this.validator.validate(config).assertValid();

    const createdBranches: string[] = [];
    if (input.createBranches !== false) {
      for (const base of config.baseBranches) {
        if (!(await this.git.branchExists(base.name))) {
          const startPoint = base.base ?? "HEAD";
          await this.git.createBranch(base.name, startPoint);
          createdBranches.push(base.name);
        }
      }
    }

    await this.configRepo.save(config);

    await this.hooks.run("post-init", {
      operation: "post-init",
      force: input.force === true,
      extra: {
        preset: input.preset,
        force: input.force === true,
        createBranches: input.createBranches !== false,
        createdBranches,
        workflowName: config.name,
        configPath: this.configRepo.path,
      },
    });

    return config;
  }
}
