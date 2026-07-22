// Domain
export { Workflow } from "./domain/aggregates/Workflow";
export { BranchTypeRule } from "./domain/valueObjects/BranchTypeRule";
export { BranchName } from "./domain/valueObjects/BranchName";
export { RemoteConfig } from "./domain/valueObjects/RemoteConfig";
export { MergeOutcome } from "./domain/valueObjects/MergeOutcome";
export type { CommitInfo } from "./domain/valueObjects/CommitInfo";
export { Branch } from "./domain/entities/Branch";
export { HookDefinition } from "./domain/hooks/HookDefinition";
export { HookPhase } from "./domain/hooks/HookPhase";
export { AutoTagPolicy } from "./domain/policies/AutoTagPolicy";
export * from "./domain/errors";
export type { GitRepository, CreateBranchOptions, MergeOptions, RawCommandResult } from "./domain/ports/GitRepository";
export type { HookRunner } from "./domain/ports/HookRunner";
export type { EventBus } from "./domain/ports/EventBus";
export { DomainEvent } from "./domain/events/DomainEvent";
export { BranchStartedEvent } from "./domain/events/BranchStartedEvent";
export { BranchFinishedEvent } from "./domain/events/BranchFinishedEvent";
export { RuleEvaluator } from "./domain/services/RuleEvaluator";
export type { Rule } from "./domain/rules/Rule";
export type { RuleContext, WorkflowAction } from "./domain/rules/RuleContext";
export { RuleResult } from "./domain/rules/RuleResult";
export { BranchDoesNotExistRule } from "./domain/rules/BranchDoesNotExistRule";
export { BaseBranchExistsRule } from "./domain/rules/BaseBranchExistsRule";
export { WorkingTreeCleanRule } from "./domain/rules/WorkingTreeCleanRule";
export { BranchNamingRule } from "./domain/rules/BranchNamingRule";
export { BranchNamingPolicy } from "./domain/valueObjects/BranchNamingPolicy";
export type { BranchNameCase } from "./domain/valueObjects/BranchNamingPolicy";
export type { MergeStrategy } from "./domain/valueObjects/MergeStrategy";
export { ConventionalCommitPolicy } from "./domain/policies/ConventionalCommitPolicy";

// Application
export { StartBranchHandler } from "./application/handlers/StartBranchHandler";
export { FinishBranchHandler } from "./application/handlers/FinishBranchHandler";
export { ListBranchesHandler } from "./application/handlers/ListBranchesHandler";
export { GetStatusHandler } from "./application/handlers/GetStatusHandler";
export { ValidateWorkflowHandler } from "./application/handlers/ValidateWorkflowHandler";
export { DoctorHandler } from "./application/handlers/DoctorHandler";
export { CleanupHandler } from "./application/handlers/CleanupHandler";
export { BranchService } from "./application/services/BranchService";
export { MergeService } from "./application/services/MergeService";
export { TagService } from "./application/services/TagService";
export { HookService } from "./application/services/HookService";
export { RemoteService } from "./application/services/RemoteService";
export { StatusService } from "./application/services/StatusService";
export type { StartBranchCommand } from "./application/commands/StartBranchCommand";
export type { FinishBranchCommand } from "./application/commands/FinishBranchCommand";
export type { GetStatusQuery } from "./application/queries/GetStatusQuery";
export type { WorkflowConfigReader } from "./application/ports/WorkflowConfigReader";
export type { StartBranchResult } from "./application/dto/StartBranchResult";
export type { FinishBranchResult, MergeResultDto } from "./application/dto/FinishBranchResult";
export type { BranchSummaryDto, BranchTreeNode, StatusReport } from "./application/dto/StatusReport";
export type { ValidateWorkflowResult } from "./application/handlers/ValidateWorkflowHandler";
export type { DoctorCheck, DoctorReport } from "./application/handlers/DoctorHandler";
export type { CleanupCandidate, CleanupResult } from "./application/handlers/CleanupHandler";

// Infrastructure
export { ShellGitRepository } from "./infrastructure/git/ShellGitRepository";
export { GitCommandError } from "./infrastructure/git/GitCommandError";
export { ShellHookRunner } from "./infrastructure/hooks/ShellHookRunner";
export { InMemoryEventBus } from "./infrastructure/events/InMemoryEventBus";
export { ConsoleLogger } from "./infrastructure/logging/ConsoleLogger";
export { NoopLogger } from "./infrastructure/logging/NoopLogger";
export { WorkflowConfigLoader } from "./infrastructure/config/WorkflowConfigLoader";
export {
  gitFlowWorkflow,
  githubFlowWorkflow,
  trunkBasedWorkflow,
  builtInWorkflows,
} from "./infrastructure/config/BuiltInWorkflows";

// Shared
export type { Logger } from "./shared/logging/Logger";

// CLI composition root (useful for embedding the CLI's wiring elsewhere)
export { Container } from "./cli/container";
export type { ContainerOptions } from "./cli/container";
