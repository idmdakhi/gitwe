export { VERSION } from "./version.js";

export * from "./domain/types.js";
export * from "./domain/errors.js";
export { Workflow } from "./domain/workflow.js";
export { assertValidBranchName, globToRegExp } from "./domain/branchName.js";
export { silentLogger, type Logger } from "./application/ports/Logger.js";
export { createConsoleLogger } from "./infrastructure/logger/consoleLogger.js";

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
export * from "./domain/config/edit.js";

export type {
  AheadBehind,
  GitRepository,
  MergeOptions,
  PushOptions,
  TagOptions,
} from "./application/ports/GitRepository.js";
export { ShellGitRepository } from "./infrastructure/git/ShellGitRepository.js";

export { Engine } from "./application/Engine.js";
export type {
  DeleteOptions,
  DeleteResult,
  EngineOptions,
  OverviewReport,
  PublishOptions,
  StartOptions,
  StartResult,
  UpdateOptions,
  UpdateResult,
} from "./application/Engine.js";
export type { FinishOptions, FinishResult } from "./application/operations/finish.js";
export { HookRunner } from "./infrastructure/hooks/HookRunner.js";
export type { HookName } from "./application/ports/HookRunner.js";
export { FileOperationStateStore as OperationStateStore } from "./infrastructure/state/OperationStateStore.js";
export type { OperationState } from "./application/ports/OperationState.js";
export { createEngine } from "./infrastructure/createEngine.js";
