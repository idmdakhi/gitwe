import type { WorkflowConfig } from "../../domain/types.js";
import type { Logger } from "../../application/ports/Logger.js";
import { silentLogger } from "../../application/ports/Logger.js";
import { Engine } from "../../application/Engine.js";
import { ShellGitRepository } from "../git/ShellGitRepository.js";
import { HookRunner } from "../hooks/HookRunner.js";
import { FileOperationStateStore } from "../state/OperationStateStore.js";
import type { GitRepository } from "../../application/ports/GitRepository.js";

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
