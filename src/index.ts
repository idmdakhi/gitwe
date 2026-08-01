/**
 * `gitwe` — a configurable git branching-workflow engine.
 *
 * This is the package's public entry point. Everything exported here is
 * part of the stable API; anything not exported here is an internal
 * implementation detail and may change without notice, even between
 * patch releases.
 *
 * @packageDocumentation
 */

// --- Composition root -------------------------------------------------
// The easiest way to use gitwe as a library: `new Container(cwd).forWorkflow()`
// gives you every use-case handler wired up against the repository's
// configured workflow.
export { Container, type WorkflowHandlers } from "#gitwe/cli/container";

// --- Domain: aggregates, entities, value objects -----------------------
export { Workflow } from "#gitwe/domain/aggregates/workflow";
export { Branch } from "#gitwe/domain/entities/branch";
export { BranchName } from "#gitwe/domain/valueObjects/branch-name";
export { BranchNamingPolicy, type BranchNameCase } from "#gitwe/domain/valueObjects/branch-naming-policy";
export { BranchTypeRule, type AutoTagConfig } from "#gitwe/domain/valueObjects/branch-type-rule";
export { BaseBranchRule } from "#gitwe/domain/valueObjects/base-branch-rule";
export { RemoteConfig } from "#gitwe/domain/valueObjects/remote-config";
export type { MergeStrategy, UpdateStrategy } from "#gitwe/domain/valueObjects/merge-strategy";
export type { CommitInfo, MergeOutcome, AheadBehind } from "#gitwe/domain/valueObjects/commit-info";

// --- Domain: ports (implement these to swap any adapter) ---------------
export type {
  GitRepository,
  CreateBranchOptions,
  MergeOptions,
  PushOptions,
  RawCommandResult,
} from "#gitwe/domain/ports/git-repository";
export type { EventBus } from "#gitwe/domain/ports/event-bus";

// --- Domain: events ------------------------------------------------------
export { DomainEvent } from "#gitwe/domain/events/domain-event";
export {
  BranchStartedEvent,
  BranchFinishedEvent,
  BranchPublishedEvent,
} from "#gitwe/domain/events/branch-events";

// --- Domain: rules -------------------------------------------------------
export type { Rule } from "#gitwe/domain/rules/rule";
export type { RuleContext, WorkflowAction } from "#gitwe/domain/rules/rule-context";
export { RuleResult } from "#gitwe/domain/rules/result";
export { RuleEvaluator } from "#gitwe/domain/services/rule-evaluator";

// --- Domain: errors --------------------------------------------------------
export * from "#gitwe/domain/errors/index";

// --- Application: commands, results, ports --------------------------------
export type { StartBranchCommand } from "#gitwe/application/commands/start-branch";
export type { FinishBranchCommand } from "#gitwe/application/commands/finish-branch";
export type { UpdateBranchCommand } from "#gitwe/application/commands/update-branch";
export type { DeleteBranchCommand } from "#gitwe/application/commands/delete-branch";
export type { PublishBranchCommand } from "#gitwe/application/commands/publish-branch";
export type { TrackBranchCommand } from "#gitwe/application/commands/track-branch";
export type { RenameBranchCommand } from "#gitwe/application/commands/rename-branch";
export type { CheckoutBranchCommand } from "#gitwe/application/commands/checkout-branch";
export type { InitWorkflowCommand } from "#gitwe/application/commands/init-workflow";
export * from "#gitwe/application/dto/results";
export type { WorkflowConfigStore } from "#gitwe/application/ports/workflow-config-store";
export { BranchResolver } from "#gitwe/application/services/branch-resolver";
export { StatusService } from "#gitwe/application/services/status-service";

// --- Application: handlers (the use cases themselves) -----------------------
export { StartBranchHandler } from "#gitwe/application/handlers/start-branch";
export { FinishBranchHandler } from "#gitwe/application/handlers/finish-branch";
export { UpdateBranchHandler } from "#gitwe/application/handlers/update-branch";
export { DeleteBranchHandler } from "#gitwe/application/handlers/delete-branch";
export { PublishBranchHandler } from "#gitwe/application/handlers/publish-branch";
export { TrackBranchHandler } from "#gitwe/application/handlers/track-branch";
export { RenameBranchHandler } from "#gitwe/application/handlers/rename-branch";
export { CheckoutBranchHandler } from "#gitwe/application/handlers/checkout-branch";
export { ListBranchesHandler, type ListBranchesQuery } from "#gitwe/application/handlers/list-branches";
export { GetStatusHandler } from "#gitwe/application/handlers/get-status";
export { InitWorkflowHandler } from "#gitwe/application/handlers/init-workflow";

// --- Infrastructure: default adapters (swap any of these via the ports above) ---
export { ShellGitRepository } from "#gitwe/infrastructure/git/shell-git-repository";
export { GitCommandError } from "#gitwe/infrastructure/git/git-command-error";
export { FileWorkflowConfigStore } from "#gitwe/infrastructure/config/file-workflow-config-store";
export {
  WorkflowSerializer,
  type WorkflowConfigFile,
} from "#gitwe/infrastructure/config/workflow-serializer";
export {
  BUILT_IN_WORKFLOWS,
  BUILT_IN_WORKFLOW_NAMES,
  type BuiltInWorkflowName,
} from "#gitwe/infrastructure/config/built-in-workflows";
export { InMemoryEventBus } from "#gitwe/infrastructure/events/in-memory-event-bus";
export { ConsoleLogger } from "#gitwe/infrastructure/logging/console-logger";

// --- Shared --------------------------------------------------------------
export type { Logger } from "#gitwe/shared/logging/logger";
