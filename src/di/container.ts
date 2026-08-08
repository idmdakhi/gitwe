/**
 * Composition helpers for wiring application ports to infrastructure adapters.
 *
 * Prefer {@link createEngine} for the common case. This module exists for tests
 * and advanced callers that need to swap a single adapter.
 */
export { createEngine, type CreateEngineOptions } from "./create-engine.js";
export { ShellGitRepository } from "../infrastructure/git/shell-git-repository.js";
export { HookRunner } from "../infrastructure/hooks/file-hook-runner.js";
export { FileOperationStateStore } from "../infrastructure/state/file-operation-state-store.js";
export { createConsoleLogger } from "../infrastructure/logger/console-logger.js";
export { silentLogger } from "../application/interfaces/logger.js";
