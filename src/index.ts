export { getVersion } from "./version.js";

export * from "./domain/entities.js";
export * from "./domain/errors.js";
export { Workflow } from "./domain/workflow.js";
export { assertValidBranchName, globToRegExp } from "./domain/branch-name.js";
export { silentLogger, type Logger } from "./application/interfaces/logger.js";
export { createConsoleLogger } from "./infrastructure/logger/console-logger.js";

export { parseWorkflowConfig } from "./domain/config/parse.js";
export {
  createPreset,
  isPresetName,
  PRESET_NAMES,
  type PresetName,
  type PresetOverrides,
} from "./domain/config/presets.js";
export {
  CONFIG_FILE_NAMES,
  DEFAULT_CONFIG_FILE,
  findConfigFile,
  loadConfig,
  readConfigFile,
  writeConfigFile,
  type LoadedConfig,
} from "./infrastructure/config/loader.js";
export * from "./domain/config/editor.js";

export type {
  AheadBehind,
  GitRepository,
  MergeOptions,
  PushOptions,
  TagOptions,
} from "./application/interfaces/git-repository.js";
export { ShellGitRepository } from "./infrastructure/git/shell-git-repository.js";

export {
  Engine,
  type DeleteOptions,
  type DeleteResult,
  type EngineOptions,
  type OverviewReport,
  type PublishOptions,
  type StartOptions,
  type StartResult,
  type UpdateOptions,
  type UpdateResult,
} from "./application/engine.js";
export type { FinishOptions, FinishResult } from "./application/use-case/finish.js";
export { HookRunner } from "./infrastructure/hooks/file-hook-runner.js";
export type { HookName } from "./application/interfaces/hook-runner.js";
export { FileOperationStateStore as OperationStateStore } from "./infrastructure/state/file-operation-state-store.js";
export type { OperationState } from "./application/interfaces/operation-state.js";
export { createEngine } from "./di/create-engine.js";
