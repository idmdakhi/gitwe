/**
 * Composition helpers for wiring application ports to infrastructure adapters.
 *
 * Prefer {@link createEngine} for the common case. This module exists for tests
 * and advanced callers that need to swap a single adapter.
 */
export { createEngine, type CreateEngineOptions } from "./createEngine.js";
export { ShellGitRepository } from "../infrastructure/git/ShellGitRepository.js";
export { HookRunner } from "../infrastructure/hooks/FileHookRunner.js";
export { FileOperationStateStore } from "../infrastructure/state/FileOperationStateStore.js";
export { createConsoleLogger } from "../infrastructure/logger/consoleLogger.js";
export { silentLogger } from "../application/interfaces/Logger.js";
