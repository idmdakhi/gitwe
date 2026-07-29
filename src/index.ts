/**
 * gitwe's library API — use the workflow engine directly from TypeScript
 * or JavaScript, without going through the CLI.
 *
 * ```ts
 * import { Container } from "gitwe";
 *
 * const gitwe = new Container({ cwd: "/path/to/repo" });
 * const result = await gitwe.kernel.run("start", { branchType: "feature", shortName: "login" });
 * console.log(result.branchName); // "feature/login"
 * ```
 *
 * `Container` is the same composition root the CLI itself uses (see
 * `src/cli/container.ts`) — nothing here is CLI-specific, so behavior is
 * identical whether you're scripting against this API or running `gitwe`
 * from a shell.
 */

// ---------------------------------------------------------------- composition
export { Container } from "#gitwe/cli/container";
export type { ContainerOptions } from "#gitwe/cli/container";

// --------------------------------------------------------------------- kernel
export { Kernel } from "#gitwe/kernel/Kernel";
export type { KernelModule } from "#gitwe/kernel/KernelModule";
export { ModuleNotFoundError, DuplicateModuleError } from "#gitwe/kernel/errors";

// --------------------------------------------------------------------- domain
export { Workflow } from "#gitwe/domain/aggregates/Workflow";
export { Branch } from "#gitwe/domain/entities/Branch";
export type {
  GitRepository,
  CreateBranchOptions,
  MergeOptions,
  RawCommandResult,
} from "#gitwe/domain/ports/GitRepository";
export type { StateStore } from "#gitwe/domain/ports/StateStore";
export * from "#gitwe/domain/errors";

// --------------------------------------------------------------------- config
export { WorkflowConfigLoader } from "#gitwe/infrastructure/config/WorkflowConfigLoader";
export { GitweProjectConfigService } from "#gitwe/infrastructure/config/GitweProjectConfigService";
export type {
  GitweProjectData,
  GitweProjectConfigServiceOptions,
  ReviewPolicy,
} from "#gitwe/infrastructure/config/GitweProjectConfigService";
export { builtInWorkflows, gitFlowWorkflow } from "#gitwe/infrastructure/config/BuiltInWorkflows";

// ---------------------------------------------------------- commands & results
export type { StartBranchCommand } from "#gitwe/application/commands/StartBranchCommand";
export type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
export type { UpdateBranchCommand } from "#gitwe/application/commands/UpdateBranchCommand";
export type { StartBranchResult } from "#gitwe/application/dto/StartBranchResult";
export type { FinishBranchResult, MergeResultDto } from "#gitwe/application/dto/FinishBranchResult";
export type { UpdateBranchResult } from "#gitwe/application/dto/UpdateBranchResult";
export type {
  StatusReport,
  BranchSummaryDto,
  BranchTreeNode,
} from "#gitwe/application/dto/StatusReport";
export type { ValidateWorkflowResult } from "#gitwe/application/handlers/ValidateWorkflowHandler";
export type { CleanupCandidate, CleanupResult } from "#gitwe/application/handlers/CleanupHandler";

// --------------------------------------------------------------------- update
export {
  type UpdateCheckResult,
  type UpdateCheckerOptions,
  UpdateChecker,
} from "#gitwe/infrastructure/update/Updatechecker";
