import { Engine } from "../engine.js";
import { HookRunner } from "../hooks/hook-runner.js";
import { FileOperationStateStore } from "../state/file-operation-state-store.js";
import { ShellGitRepository } from "../git/shell-git-repository.js";
import { repositoryRoot } from "../git/repository-root.js";
import { loadWorkflow } from "../config/load-workflow.js";
import { createConsoleLogger, silentLogger } from "../logger/index.js";

import type { Logger } from "../logger/logger.js";
import type { GitRepository } from "../git/git-repository.js";

export interface CreateEngineOptions {
  cwd?: string;

  config?: string;

  verbose?: boolean;

  logger?: Logger;

  git?: GitRepository;
}

export async function createEngine(options: CreateEngineOptions = {}): Promise<Engine> {
  const cwd = options.cwd ?? process.cwd();

  const root = await repositoryRoot(cwd);

  const loaded = await loadWorkflow({
    root,
    config: options.config,
  });

  const logger = options.logger ?? (options.verbose ? createConsoleLogger(true) : silentLogger);

  const git =
    options.git ??
    new ShellGitRepository({
      cwd: root,
      trace: options.verbose ? (args) => logger.debug(`git ${args.join(" ")}`) : undefined,
    });

  const hooks = new HookRunner(root, loaded.config.hooks, logger);

  const state = new FileOperationStateStore(await git.gitDir());

  return Engine.create({
    root,
    config: loaded.config,
    logger,
    configPath: loaded.path,
    git,
    hooks,
    state,
  });
}
