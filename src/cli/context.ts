import { GitweError } from "../domain/errors.js";
import { loadConfig, type LoadedConfig } from "../infrastructure/config/loader.js";
import { createConsoleLogger } from "../infrastructure/logger/consoleLogger.js";
import { Engine } from "../application/Engine.js";
import { createEngine as wireEngine } from "../di/createEngine.js";
import { ShellGitRepository } from "../infrastructure/git/ShellGitRepository.js";
import type { GlobalOptions } from "./options.js";

export async function repositoryRoot(cwd: string): Promise<string> {
  const git = new ShellGitRepository({ cwd });
  try {
    return await git.root();
  } catch {
    throw new GitweError("NOT_A_REPOSITORY", `${cwd} is not a git repository`);
  }
}

export function loadWorkflow(root: string, options: GlobalOptions): LoadedConfig {
  return loadConfig({ cwd: options.cwd ?? root, configPath: options.config, root });
}

export function tryLoadWorkflow(root: string, options: GlobalOptions): LoadedConfig | undefined {
  try {
    return loadWorkflow(root, options);
  } catch {
    return undefined;
  }
}

export async function createEngine(options: GlobalOptions): Promise<Engine> {
  const cwd = options.cwd ?? process.cwd();
  const root = await repositoryRoot(cwd);
  const loaded = loadWorkflow(root, options);
  const logger = createConsoleLogger(options.verbose === true);
  const git = new ShellGitRepository({
    cwd: root,
    trace: options.verbose === true ? (args) => logger.debug(`git ${args.join(" ")}`) : undefined,
  });
  return wireEngine({
    root,
    config: loaded.config,
    logger,
    configPath: loaded.path,
    git,
  });
}
