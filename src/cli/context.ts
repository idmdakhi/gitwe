import { GitweError } from "../core/errors.js";
import { loadConfig, type LoadedConfig } from "../core/config/loader.js";
import { createConsoleLogger } from "../core/logger.js";
import { Engine } from "../engine/Engine.js";
import { ShellGitRepository } from "../git/ShellGitRepository.js";

export interface GlobalOptions {
  config?: string;
  cwd?: string;
  verbose?: boolean;
}

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

/** Read the workflow without failing when the repository is not initialised yet. */
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
  return Engine.create({
    root,
    config: loaded.config,
    logger,
    configPath: loaded.path,
    git,
  });
}
