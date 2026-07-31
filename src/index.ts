export { VERSION } from "./version.js";

export * from "./core/types.js";
export * from "./core/errors.js";
export { Workflow } from "./core/workflow.js";
export { assertValidBranchName, globToRegExp } from "./core/branchName.js";
export { createConsoleLogger, silentLogger, type Logger } from "./core/logger.js";

export { parseWorkflowConfig } from "./core/config/parse.js";
export {
  createPreset,
  isPresetName,
  PRESET_NAMES,
  type PresetName,
  type PresetOverrides,
} from "./core/config/presets.js";
export {
  CONFIG_FILE_NAMES,
  DEFAULT_CONFIG_FILE,
  findConfigFile,
  loadConfig,
  readConfigFile,
  writeConfigFile,
  type LoadedConfig,
} from "./core/config/loader.js";
export * from "./core/config/edit.js";

export type {
  AheadBehind,
  GitRepository,
  MergeOptions,
  PushOptions,
  TagOptions,
} from "./git/GitRepository.js";
export { ShellGitRepository } from "./git/ShellGitRepository.js";

export { Engine } from "./engine/Engine.js";
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
} from "./engine/Engine.js";
export type { FinishOptions, FinishResult } from "./engine/operations/finish.js";
export { HookRunner, type HookName } from "./engine/hooks.js";
export { OperationStateStore, type OperationState } from "./engine/state.js";
