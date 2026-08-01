export { VERSION } from "./version.js";

export * from "./domain/entities.js";
export * from "./domain/errors.js";
export { Workflow } from "./domain/workflow.js";
export { assertValidBranchName, globToRegExp } from "./domain/branchName.js";
export { silentLogger, type Logger } from "./application/interfaces/Logger.js";
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
export * from "./domain/config/editor.js";

export type {
  AheadBehind,
  GitRepository,
  MergeOptions,
  PushOptions,
  TagOptions,
} from "./application/interfaces/GitRepository.js";
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
export type { FinishOptions, FinishResult } from "./application/use-case/finish.js";
export { HookRunner } from "./infrastructure/hooks/FileHookRunner.js";
export type { HookName } from "./application/interfaces/HookRunner.js";
export { FileOperationStateStore as OperationStateStore } from "./infrastructure/state/FileOperationStateStore.js";
export type { OperationState } from "./application/interfaces/OperationState.js";
export { createEngine } from "./di/createEngine.js";
