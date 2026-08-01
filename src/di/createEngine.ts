import type { WorkflowConfig } from "../domain/entities.js";
import { type Logger, silentLogger } from "../application/interfaces/Logger.js";
import { Engine } from "../application/Engine.js";
import { ShellGitRepository } from "../infrastructure/git/ShellGitRepository.js";
import { HookRunner } from "../infrastructure/hooks/FileHookRunner.js";
import { FileOperationStateStore } from "../infrastructure/state/FileOperationStateStore.js";
import type { GitRepository } from "../application/interfaces/GitRepository.js";

export interface CreateEngineOptions {
  root: string;
  config: WorkflowConfig;
  logger?: Logger;
  configPath?: string;
  git?: GitRepository;
}

/** Wire infrastructure adapters and construct an Engine (composition root). */
export async function createEngine(options: CreateEngineOptions): Promise<Engine> {
  const logger = options.logger ?? silentLogger;
  const git = options.git ?? new ShellGitRepository({ cwd: options.root });
  const hooks = new HookRunner(options.root, options.config.hooks, logger);
  const state = new FileOperationStateStore(await git.gitDir());
  return Engine.create({
    root: options.root,
    config: options.config,
    logger,
    configPath: options.configPath,
    git,
    hooks,
    state,
  });
}
