import path from "node:path";
import { Workflow } from "../domain/aggregates/Workflow";
import { RuleEvaluator } from "../domain/services/RuleEvaluator";
import { BranchDoesNotExistRule } from "../domain/rules/BranchDoesNotExistRule";
import { BaseBranchExistsRule } from "../domain/rules/BaseBranchExistsRule";
import { WorkingTreeCleanRule } from "../domain/rules/WorkingTreeCleanRule";
import type { GitRepository } from "../domain/ports/GitRepository";
import type { Logger } from "../shared/logging/Logger";

import { ShellGitRepository } from "../infrastructure/git/ShellGitRepository";
import { ShellHookRunner } from "../infrastructure/hooks/ShellHookRunner";
import { InMemoryEventBus } from "../infrastructure/events/InMemoryEventBus";
import { ConsoleLogger } from "../infrastructure/logging/ConsoleLogger";
import { NoopLogger } from "../infrastructure/logging/NoopLogger";
import { WorkflowConfigLoader } from "../infrastructure/config/WorkflowConfigLoader";
import { builtInWorkflows, gitFlowWorkflow } from "../infrastructure/config/BuiltInWorkflows";

import { BranchService } from "../application/services/BranchService";
import { MergeService } from "../application/services/MergeService";
import { TagService } from "../application/services/TagService";
import { HookService } from "../application/services/HookService";
import { RemoteService } from "../application/services/RemoteService";
import { StatusService } from "../application/services/StatusService";

import { StartBranchHandler } from "../application/handlers/StartBranchHandler";
import { FinishBranchHandler } from "../application/handlers/FinishBranchHandler";
import { ListBranchesHandler } from "../application/handlers/ListBranchesHandler";
import { GetStatusHandler } from "../application/handlers/GetStatusHandler";
import { ValidateWorkflowHandler } from "../application/handlers/ValidateWorkflowHandler";
import { DoctorHandler } from "../application/handlers/DoctorHandler";

export interface ContainerOptions {
  /** Path to a JSON/YAML workflow config file. Falls back to the built-in git-flow workflow. */
  configPath?: string;
  /** Name of a built-in workflow ("git-flow" | "github-flow" | "trunk-based"). Ignored if `configPath` is set. */
  builtIn?: string;
  /** Suppress info-level logging. */
  quiet?: boolean;
  cwd?: string;
}

/**
 * The single place concrete infrastructure gets wired to domain ports and
 * handed to application services — nothing outside this file imports
 * `infrastructure/*` directly. CLI commands only ever see the `Container`.
 */
export class Container {
  readonly workflow: Workflow;
  readonly git: GitRepository;
  readonly logger: Logger;

  readonly startBranchHandler: StartBranchHandler;
  readonly finishBranchHandler: FinishBranchHandler;
  readonly listBranchesHandler: ListBranchesHandler;
  readonly getStatusHandler: GetStatusHandler;
  readonly validateWorkflowHandler: ValidateWorkflowHandler;
  readonly doctorHandler: DoctorHandler;

  constructor(options: ContainerOptions = {}) {
    const cwd = options.cwd ?? process.cwd();
    this.logger = options.quiet ? new NoopLogger() : new ConsoleLogger();

    const configLoader = new WorkflowConfigLoader();
    this.workflow = options.configPath
      ? configLoader.load(path.resolve(cwd, options.configPath))
      : (builtInWorkflows[options.builtIn ?? "git-flow"] ?? gitFlowWorkflow);

    this.git = new ShellGitRepository(cwd, this.logger);
    const hookRunner = new ShellHookRunner(cwd, this.logger);
    const eventBus = new InMemoryEventBus(this.logger);
    const ruleEvaluator = new RuleEvaluator([
      new BranchDoesNotExistRule(),
      new BaseBranchExistsRule(),
      new WorkingTreeCleanRule(),
    ]);

    const branchService = new BranchService(this.git, ruleEvaluator);
    const mergeService = new MergeService(this.git);
    const tagService = new TagService(this.git);
    const hookService = new HookService(hookRunner);
    const remoteService = new RemoteService(this.git);
    const statusService = new StatusService(this.git);

    this.startBranchHandler = new StartBranchHandler(
      this.workflow,
      branchService,
      hookService,
      eventBus,
      this.logger,
    );
    this.finishBranchHandler = new FinishBranchHandler(
      this.workflow,
      this.git,
      ruleEvaluator,
      mergeService,
      tagService,
      hookService,
      remoteService,
      eventBus,
      this.logger,
    );
    this.listBranchesHandler = new ListBranchesHandler(this.git);
    this.getStatusHandler = new GetStatusHandler(this.workflow, statusService);
    this.validateWorkflowHandler = new ValidateWorkflowHandler(configLoader);
    this.doctorHandler = new DoctorHandler(this.git, this.workflow);
  }
}
