import path from "node:path";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import { RuleEvaluator } from "#gitwe/domain/services/RuleEvaluator";
import { BranchDoesNotExistRule } from "#gitwe/domain/rules/BranchDoesNotExistRule";
import { BaseBranchExistsRule } from "#gitwe/domain/rules/BaseBranchExistsRule";
import { WorkingTreeCleanRule } from "#gitwe/domain/rules/WorkingTreeCleanRule";
import { BranchNamingRule } from "#gitwe/domain/rules/BranchNamingRule";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { Logger } from "#gitwe/shared/logging/Logger";

import { ShellGitRepository } from "#gitwe/infrastructure/git/ShellGitRepository";
import { ShellHookRunner } from "#gitwe/infrastructure/hooks/ShellHookRunner";
import { InMemoryEventBus } from "#gitwe/infrastructure/events/InMemoryEventBus";
import { ConsoleLogger } from "#gitwe/infrastructure/logging/ConsoleLogger";
import { NoopLogger } from "#gitwe/infrastructure/logging/NoopLogger";
import { WorkflowConfigLoader } from "#gitwe/infrastructure/config/WorkflowConfigLoader";
import { builtInWorkflows, gitFlowWorkflow } from "#gitwe/infrastructure/config/BuiltInWorkflows";

import { BranchService } from "#gitwe/application/services/BranchService";
import { MergeService } from "#gitwe/application/services/MergeService";
import { TagService } from "#gitwe/application/services/TagService";
import { HookService } from "#gitwe/application/services/HookService";
import { RemoteService } from "#gitwe/application/services/RemoteService";
import { StatusService } from "#gitwe/application/services/StatusService";

import { StartBranchHandler } from "#gitwe/application/handlers/StartBranchHandler";
import { FinishBranchHandler } from "#gitwe/application/handlers/FinishBranchHandler";
import { ListBranchesHandler } from "#gitwe/application/handlers/ListBranchesHandler";
import { GetStatusHandler } from "#gitwe/application/handlers/GetStatusHandler";
import { ValidateWorkflowHandler } from "#gitwe/application/handlers/ValidateWorkflowHandler";
import { DoctorHandler } from "#gitwe/application/handlers/DoctorHandler";
import { CleanupHandler } from "#gitwe/application/handlers/CleanupHandler";
// import { NodePluginLoader } from "#gitwe/infrastructure/plugins/NodePluginLoader";
import { FileStateStore } from "#gitwe/infrastructure/state/FileStateStore";
// import { PluginService } from "#gitwe/application/services/PluginService";

export interface ContainerOptions {
  /** Path to a JSON/YAML workflow config file. Falls back to the built-in git-flow workflow. */
  configPath?: string;
  /** Name of a built-in workflow ("git-flow" | "github-flow" | "trunk-based"). Ignored if `configPath` is set. */
  builtIn?: string;
  /** Suppress info-level logging. Ignored if `logger` is provided. */
  quiet?: boolean;
  /** Custom logger implementation. Takes precedence over `quiet` — pass this to route logs anywhere (e.g. a VS Code OutputChannel) instead of the console. */
  logger?: Logger;
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
  readonly cleanupHandler: CleanupHandler;

  constructor(options: ContainerOptions = {}) {
    const cwd = options.cwd ?? process.cwd();
    this.logger = options.logger ?? (options.quiet ? new NoopLogger() : new ConsoleLogger());

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
      new BranchNamingRule(),
    ]);

    const branchService = new BranchService(this.git, ruleEvaluator);
    const mergeService = new MergeService(this.git);
    const tagService = new TagService(this.git);
    const hookService = new HookService(hookRunner);
    const remoteService = new RemoteService(this.git);
    const statusService = new StatusService(this.git);

    const stateStore = new FileStateStore(cwd);

    this.startBranchHandler = new StartBranchHandler(
      this.workflow,
      branchService,
      hookService,
      eventBus,
      this.logger,
      stateStore,
    );

    // pluginContext هر بار از همین وابستگی‌ها ساخته می‌شه، نه singleton، چون workflow می‌تونه per-command عوض بشه

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
    this.cleanupHandler = new CleanupHandler(this.git, this.workflow);
  }

  static async create(options: ContainerOptions = {}): Promise<Container> {
    const instance = new Container(options);
    // بارگذاری پلاگین‌ها به صورت ناهمزمان
    // const pluginSpecifiers = instance.workflow.plugins ?? [];
    // const pluginLoader = new NodePluginLoader(pluginSpecifiers, options.cwd ?? process.cwd());
    // const plugins = await pluginLoader.load();
    // const pluginService = new PluginService(plugins);
    return instance;
  }
}
