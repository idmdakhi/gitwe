import type { WorkflowConfig } from "../domain/entities.js";
import { type Logger, silentLogger } from "../application/interfaces/logger.js";
import { Engine } from "../application/engine.js";
import { ShellGitRepository } from "../infrastructure/git/shell-git-repository.js";
import { HookRunner } from "../infrastructure/hooks/file-hook-runner.js";
import { FileOperationStateStore } from "../infrastructure/state/file-operation-state-store.js";
import type { GitRepository } from "../application/interfaces/git-repository.js";

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
