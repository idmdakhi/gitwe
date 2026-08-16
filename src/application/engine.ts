import type { WorkflowConfig } from "../domain/entities/workflow-config.entity.js";
import { NotInitializedError } from "../domain/errors/index.js";
import { WorkflowService } from "../domain/services/workflow.service.js";
import type { ConfigRepository } from "../domain/ports/config-repository.port.js";
import type { GitRepository } from "../domain/ports/git-repository.port.js";
import type { HookRunner } from "../domain/ports/hook-runner.port.js";
import type { Logger } from "../domain/ports/logger.port.js";
import { silentLogger } from "../domain/ports/logger.port.js";
import type { OperationStateStore } from "../domain/ports/operation-state-store.port.js";

import { InitWorkflowUseCase } from "./use-cases/init-workflow.use-case.js";
import { StartBranchUseCase } from "./use-cases/start-branch.use-case.js";
import { FinishBranchUseCase } from "./use-cases/finish-branch.use-case.js";
import { UpdateBranchUseCase } from "./use-cases/update-branch.use-case.js";
import { PublishBranchUseCase } from "./use-cases/publish-branch.use-case.js";
import { DeleteBranchUseCase } from "./use-cases/delete-branch.use-case.js";
import { ListBranchesUseCase } from "./use-cases/list-branches.use-case.js";
import { OverviewUseCase } from "./use-cases/overview.use-case.js";
import { ValidateWorkflowUseCase } from "./use-cases/validate-workflow.use-case.js";

export interface EngineDeps {
  readonly configRepo: ConfigRepository;
  readonly git: GitRepository;
  readonly hooks: HookRunner;
  readonly stateStore: OperationStateStore;
  readonly logger?: Logger;
}

export interface InitEngineOptions {
  readonly preset?: "classic" | "github" | "gitlab";
  readonly config?: WorkflowConfig;
  readonly force?: boolean;
  readonly createBranches?: boolean;
}

/**
 * Public facade over every use case. This is what both the CLI and
 * library consumers talk to — nobody outside `application/` ever
 * imports a use case directly.
 */
export class Engine {
  private constructor(
    readonly workflow: WorkflowService,
    private readonly deps: Required<EngineDeps>,
  ) {}

  static async create(deps: EngineDeps): Promise<Engine> {
    const config = await deps.configRepo.load();
    if (!config) throw new NotInitializedError();
    const workflow = new WorkflowService(config);
    return new Engine(workflow, { logger: silentLogger, ...deps });
  }

  static async init(deps: EngineDeps, options: InitEngineOptions): Promise<Engine> {
    const useCase = new InitWorkflowUseCase(deps.configRepo, deps.git);
    const config = await useCase.execute({
      preset: options.preset,
      config: options.config,
      force: options.force,
      createBranches: options.createBranches,
    });
    return new Engine(new WorkflowService(config), { logger: silentLogger, ...deps });
  }
  /** Optional helper for older call sites that only pass a preset name. */
  static async initFromPreset(
    deps: EngineDeps,
    preset: "classic" | "github" | "gitlab",
    force = false,
  ): Promise<Engine> {
    return Engine.init(deps, { preset, force });
  }

  get config(): WorkflowConfig {
    return this.workflow.config;
  }

  start(typeNameOrAlias: string, name: string, options: { base?: string; fetch?: boolean } = {}) {
    return new StartBranchUseCase(
      this.workflow,
      this.deps.git,
      this.deps.hooks,
      this.deps.logger,
    ).execute({
      typeNameOrAlias,
      name,
      ...(options.base ? { baseOverride: options.base } : {}),
      ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
    });
  }

  finish(
    branch: string,
    options: { squash?: boolean; push?: boolean; currentVersion?: string } = {},
  ) {
    return new FinishBranchUseCase(
      this.workflow,
      this.deps.git,
      this.deps.hooks,
      this.deps.logger,
      this.deps.stateStore,
    ).execute({ kind: "start", branch, ...options });
  }

  continueFinish() {
    return new FinishBranchUseCase(
      this.workflow,
      this.deps.git,
      this.deps.hooks,
      this.deps.logger,
      this.deps.stateStore,
    ).execute({ kind: "continue" });
  }

  abortFinish() {
    return new FinishBranchUseCase(
      this.workflow,
      this.deps.git,
      this.deps.hooks,
      this.deps.logger,
      this.deps.stateStore,
    ).execute({ kind: "abort" });
  }

  update(branch: string, options: { rebase?: boolean; fetch?: boolean } = {}) {
    return new UpdateBranchUseCase(
      this.workflow,
      this.deps.git,
      this.deps.hooks,
      this.deps.logger,
    ).execute({
      branch,
      ...options,
    });
  }

  publish(branch: string, options: { force?: boolean } = {}) {
    return new PublishBranchUseCase(
      this.workflow,
      this.deps.git,
      this.deps.hooks,
      this.deps.logger,
    ).execute({
      branch,
      ...options,
    });
  }

  delete(branch: string, options: { force?: boolean; remote?: boolean } = {}) {
    return new DeleteBranchUseCase(this.workflow, this.deps.git, this.deps.hooks).execute({
      branch,
      ...options,
    });
  }

  list(typeNameOrAlias?: string, pattern?: string) {
    return new ListBranchesUseCase(this.workflow, this.deps.git).execute({
      ...(typeNameOrAlias ? { typeNameOrAlias } : {}),
      ...(pattern ? { pattern } : {}),
    });
  }

  overview() {
    return new OverviewUseCase(this.workflow, this.deps.git).execute();
  }

  validate() {
    return new ValidateWorkflowUseCase().execute(this.config);
  }
}
