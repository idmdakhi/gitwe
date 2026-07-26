// Domain
export { Workflow } from "#gitwe/domain/aggregates/Workflow";
export { BranchTypeRule } from "#gitwe/domain/valueObjects/BranchTypeRule";
export { BranchName } from "#gitwe/domain/valueObjects/BranchName";
export { RemoteConfig } from "#gitwe/domain/valueObjects/RemoteConfig";
export { MergeOutcome } from "#gitwe/domain/valueObjects/MergeOutcome";
export type { CommitInfo } from "#gitwe/domain/valueObjects/CommitInfo";
export { Branch } from "#gitwe/domain/entities/Branch";
export { HookDefinition } from "#gitwe/domain/hooks/HookDefinition";
export { HookPhase } from "#gitwe/domain/hooks/HookPhase";
export { AutoTagPolicy } from "#gitwe/domain/policies/AutoTagPolicy";
export * from "#gitwe/domain/errors";
export type {
  GitRepository,
  CreateBranchOptions,
  MergeOptions,
  RawCommandResult,
} from "#gitwe/domain/ports/GitRepository";
export type { HookRunner } from "#gitwe/domain/ports/HookRunner";
export type { EventBus } from "#gitwe/domain/ports/EventBus";
export { DomainEvent } from "#gitwe/domain/events/DomainEvent";
export { BranchStartedEvent } from "#gitwe/domain/events/BranchStartedEvent";
export { BranchFinishedEvent } from "#gitwe/domain/events/BranchFinishedEvent";
export { RuleEvaluator } from "#gitwe/domain/services/RuleEvaluator";
export type { Rule } from "#gitwe/domain/rules/Rule";
export type { RuleContext, WorkflowAction } from "#gitwe/domain/rules/RuleContext";
export { RuleResult } from "#gitwe/domain/rules/RuleResult";
export { BranchDoesNotExistRule } from "#gitwe/domain/rules/BranchDoesNotExistRule";
export { BaseBranchExistsRule } from "#gitwe/domain/rules/BaseBranchExistsRule";
export { WorkingTreeCleanRule } from "#gitwe/domain/rules/WorkingTreeCleanRule";
export { BranchNamingRule } from "#gitwe/domain/rules/BranchNamingRule";
export { BranchNamingPolicy } from "#gitwe/domain/valueObjects/BranchNamingPolicy";
export type { BranchNameCase } from "#gitwe/domain/valueObjects/BranchNamingPolicy";
export type { MergeStrategy } from "#gitwe/domain/valueObjects/MergeStrategy";
export type { UpdateStrategy } from "#gitwe/domain/valueObjects/UpdateStrategy";
export { ConventionalCommitPolicy } from "#gitwe/domain/policies/ConventionalCommitPolicy";

// Application
export { StartBranchHandler } from "#gitwe/application/handlers/StartBranchHandler";
export { FinishBranchHandler } from "#gitwe/application/handlers/FinishBranchHandler";
export { ListBranchesHandler } from "#gitwe/application/handlers/ListBranchesHandler";
export { GetStatusHandler } from "#gitwe/application/handlers/GetStatusHandler";
export { ValidateWorkflowHandler } from "#gitwe/application/handlers/ValidateWorkflowHandler";
export { DoctorHandler } from "#gitwe/application/handlers/DoctorHandler";
export { CleanupHandler } from "#gitwe/application/handlers/CleanupHandler";
export { UpdateBranchHandler } from "#gitwe/application/handlers/UpdateBranchHandler";
export { BranchService } from "#gitwe/application/services/BranchService";
export { MergeService } from "#gitwe/application/services/MergeService";
export { TagService } from "#gitwe/application/services/TagService";
export { HookService } from "#gitwe/application/services/HookService";
export { RemoteService } from "#gitwe/application/services/RemoteService";
export { StatusService } from "#gitwe/application/services/StatusService";
export type { StartBranchCommand } from "#gitwe/application/commands/StartBranchCommand";
export type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
export type { UpdateBranchCommand } from "#gitwe/application/commands/UpdateBranchCommand";
export type { GetStatusQuery } from "#gitwe/application/queries/GetStatusQuery";
export type { WorkflowConfigReader } from "#gitwe/application/ports/WorkflowConfigReader";
export type { StartBranchResult } from "#gitwe/application/dto/StartBranchResult";
export type { FinishBranchResult, MergeResultDto } from "#gitwe/application/dto/FinishBranchResult";
export type { UpdateBranchResult } from "#gitwe/application/dto/UpdateBranchResult";
export type {
  BranchSummaryDto,
  BranchTreeNode,
  StatusReport,
} from "#gitwe/application/dto/StatusReport";
export type { ValidateWorkflowResult } from "#gitwe/application/handlers/ValidateWorkflowHandler";
export type { DoctorCheck, DoctorReport } from "#gitwe/application/handlers/DoctorHandler";
export type { CleanupCandidate, CleanupResult } from "#gitwe/application/handlers/CleanupHandler";

// Infrastructure
export { ShellGitRepository } from "#gitwe/infrastructure/git/ShellGitRepository";
export { GitCommandError } from "#gitwe/infrastructure/git/GitCommandError";
export { ShellHookRunner } from "#gitwe/infrastructure/hooks/ShellHookRunner";
export { InMemoryEventBus } from "#gitwe/infrastructure/events/InMemoryEventBus";
export { ConsoleLogger } from "#gitwe/infrastructure/logging/ConsoleLogger";
export { NoopLogger } from "#gitwe/infrastructure/logging/NoopLogger";
export { WorkflowConfigLoader } from "#gitwe/infrastructure/config/WorkflowConfigLoader";
export {
  gitFlowWorkflow,
  githubFlowWorkflow,
  trunkBasedWorkflow,
  builtInWorkflows,
} from "#gitwe/infrastructure/config/BuiltInWorkflows";

// Shared
export type { Logger } from "#gitwe/shared/logging/Logger";

// Kernel
export { Kernel } from "#gitwe/kernel/Kernel";
export type { KernelModule } from "#gitwe/kernel/KernelModule";
export type { KernelModuleInfo } from "#gitwe/kernel/Kernel";
export { ModuleNotFoundError, DuplicateModuleError } from "#gitwe/kernel/errors";
export {
  StartModule,
  FinishModule,
  UpdateModule,
  ListBranchesModule,
  StatusModule,
  ValidateWorkflowModule,
  DoctorModule,
  CleanupModule,
} from "#gitwe/kernel/modules";
export type { CleanupInput } from "#gitwe/kernel/modules/CleanupModule";

// CLI composition root (useful for embedding the CLI's wiring elsewhere)
export { Container } from "#gitwe/cli/container";
export type { ContainerOptions } from "#gitwe/cli/container";
