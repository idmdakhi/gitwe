// Library entry point.
export { Engine } from "./application/engine.js";
export type { EngineDeps } from "./application/engine.js";
export * from "./domain/index.js";
export { presets, classicPreset, githubPreset, gitlabPreset } from "./infrastructure/config/presets.js";
export type { PresetName } from "./infrastructure/config/presets.js";
export { ShellGitRepository } from "./infrastructure/git/shell-git-repository.adapter.js";
export { YamlConfigRepository } from "./infrastructure/config/yaml-config-repository.adapter.js";
export { FileHookRunner } from "./infrastructure/hooks/file-hook-runner.adapter.js";
export { ConsoleLogger } from "./infrastructure/logger/console-logger.adapter.js";
export { FileOperationStateStore } from "./infrastructure/state/file-operation-state-store.adapter.js";
export { version } from "./version.js";
