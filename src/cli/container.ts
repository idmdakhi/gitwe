import path from "node:path";
import fs from "node:fs";

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
import { UpdateBranchHandler } from "#gitwe/application/handlers/UpdateBranchHandler";

import { Kernel } from "#gitwe/kernel/Kernel";
import {
  ListBranchesModule,
  StatusModule,
  ValidateWorkflowModule,
  DoctorModule,
  CleanupModule,
} from "#gitwe/kernel/modules";
import { VersionService } from "#gitwe/application/services/VersionService";
import { GitTagVersionStore } from "#gitwe/infrastructure/version/GitTagVersionStore";
import { PackageJsonVersionStore } from "#gitwe/infrastructure/version/PackageJsonVersionStore";
import { CompositeVersionStore } from "#gitwe/infrastructure/version/CompositeVersionStore";
import { ConventionalChangelogWriter } from "#gitwe/infrastructure/version/ConventionalChangelogWriter";
import { VersionShowModule, VersionBumpModule } from "#gitwe/kernel/modules/VersionModule";
// ===== Imports =====
import { TransitionRuntime } from "#gitwe/kernel/pipeline/TransitionRuntime";
import { PipelineStage } from "#gitwe/kernel/pipeline/Stage";
import { PolicyEngine } from "#gitwe/kernel/policy/PolicyEngine";

// ===== Capabilities =====
// Validate
import { WorkingTreeCleanCapability } from "#gitwe/kernel/capabilities/validate/WorkingTreeCleanCapability";
import { BranchExistsCapability } from "#gitwe/kernel/capabilities/validate/BranchExistsCapability";
import { ProtectedBranchCapability } from "#gitwe/kernel/capabilities/validate/ProtectedBranchCapability";

// Transition
import { MergeCapability } from "#gitwe/kernel/capabilities/transitions/MergeCapability";
import { DeleteBranchCapability } from "#gitwe/kernel/capabilities/transitions/DeleteBranchCapability";
import { CreateBranchCapability } from "#gitwe/kernel/capabilities/transitions/CreateBranchCapability";

// Post Transition
import { VersionBumpCapability } from "#gitwe/kernel/capabilities/post/VersionBumpCapability";
import { TagCapability } from "#gitwe/kernel/capabilities/post/TagCapability";
import { ChangelogCapability } from "#gitwe/kernel/capabilities/post/ChangelogCapability";

// Finalize
import { PushCapability } from "#gitwe/kernel/capabilities/finalize/PushCapability";
import { EventPublishCapability } from "#gitwe/kernel/capabilities/finalize/EventPublishCapability";

// ===== Modules =====
import { StartModule } from "#gitwe/kernel/modules/StartModule";
import { FinishModule } from "#gitwe/kernel/modules/FinishModule";
import { UpdateModule } from "#gitwe/kernel/modules/UpdateModule";
import { RuleValidationCapability } from "#gitwe/kernel/capabilities/validate/RuleValidationCapability";
import { PublishStartEventCapability } from "#gitwe/kernel/capabilities/finalize/PublishStartEventCapability";
import { NoopStateStore } from "#gitwe/infrastructure/state/NoopStateStore";
import type { StateStore } from "#gitwe/domain/ports/StateStore";
import { GitweProjectConfigService } from "#gitwe/infrastructure/config/GitweProjectConfigService";

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
  configDir?: string;
}

/**
 * The single place concrete infrastructure gets wired to domain ports and
 * handed to application services — nothing outside this file imports
 * `infrastructure/*` directly. CLI commands only ever see the `Container`.
 */
export class Container {
  readonly workflow: Workflow;
  readonly projectConfig: GitweProjectConfigService;
  readonly git: GitRepository;
  readonly logger: Logger;

  readonly startBranchHandler: StartBranchHandler;
  readonly finishBranchHandler: FinishBranchHandler;
  readonly listBranchesHandler: ListBranchesHandler;
  readonly getStatusHandler: GetStatusHandler;
  readonly validateWorkflowHandler: ValidateWorkflowHandler;
  readonly doctorHandler: DoctorHandler;
  readonly cleanupHandler: CleanupHandler;
  readonly updateBranchHandler: UpdateBranchHandler;

  /**
   * The dispatch surface: every capability above is also registered here
   * under a short name. Prefer this over the handler properties when you
   * want to call a capability generically (by name, e.g. from a script or
   * a future plugin) rather than importing its concrete handler type.
   */
  readonly kernel: Kernel;

  constructor(options: ContainerOptions = {}) {
    const cwd = options.cwd ?? process.cwd();
    this.logger = options.logger ?? (options.quiet ? new NoopLogger() : new ConsoleLogger());

    const configDir = options.configDir ?? ".gitwe";

    this.projectConfig = new GitweProjectConfigService({
      rootDir: cwd,
      dirName: configDir,
      logger: this.logger,
    });

    const stateStore: StateStore = new NoopStateStore();

    const configLoader = new WorkflowConfigLoader();
    this.workflow = options.configPath
      ? configLoader.load(path.resolve(cwd, options.configPath))
      : options.builtIn
        ? (builtInWorkflows[options.builtIn] ?? gitFlowWorkflow)
        : this.projectConfig.getWorkflow();

    // ۱. اگر --config مشخص شده
    if (options.configPath) {
      this.workflow = configLoader.load(path.resolve(cwd, options.configPath));
    }
    // ۲. اگر --workflow مشخص شده
    else if (options.builtIn) {
      this.workflow = builtInWorkflows[options.builtIn] ?? gitFlowWorkflow;
    }
    // ۳. بررسی .gitwe در دایرکتوری جاری
    else {
      const projectConfigService = new GitweProjectConfigService({
        rootDir: cwd,
        dirName: ".gitwe",
        logger: this.logger,
      });
      const data = projectConfigService.load();
      if (data.configPath) {
        this.workflow = projectConfigService.getWorkflow();
      } else {
        // ۴. استفاده از فایل‌های پیش‌فرض (src/config یا dist/config)
        const defaultPath = this.getDefaultConfigPath(cwd);
        if (defaultPath) {
          this.workflow = configLoader.load(defaultPath);
        } else {
          // ۵. در نهایت، گردش‌کار داخلی git-flow
          this.workflow = gitFlowWorkflow;
        }
      }
    }

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

    this.startBranchHandler = new StartBranchHandler(
      this.workflow,
      branchService,
      hookService,
      eventBus,
      this.logger,
    );

    const versionStores = [
      new GitTagVersionStore(this.git, "v"),
      new PackageJsonVersionStore("package.json"),
    ];
    const compositeStore = new CompositeVersionStore(versionStores, "highest");
    const changelogWriter = new ConventionalChangelogWriter(this.git, this.logger);
    const versionService = new VersionService({
      stores: [compositeStore],
      git: this.git,
      changelogWriter,
      logger: this.logger,
      requireCleanTree: true,
      tagPrefix: "v",
    });

    // 1. Policy Engine
    const policyEngine = new PolicyEngine(this.workflow);
    policyEngine.loadFromConfig();

    // 2. Transition Runtime
    const runtime = new TransitionRuntime({
      failFast: true,
      continueOnFailure: false,
    });
    runtime.setPolicyEngine(policyEngine);

    // 3. Register Capabilities

    // VALIDATE
    runtime.register(new WorkingTreeCleanCapability(), PipelineStage.VALIDATE);
    runtime.register(new BranchExistsCapability(), PipelineStage.VALIDATE);
    runtime.register(new ProtectedBranchCapability(), PipelineStage.VALIDATE);
    runtime.register(new RuleValidationCapability(ruleEvaluator), PipelineStage.VALIDATE);

    // TRANSITION
    runtime.register(new MergeCapability(mergeService), PipelineStage.TRANSITION);
    runtime.register(new DeleteBranchCapability(this.git), PipelineStage.TRANSITION);
    runtime.register(new CreateBranchCapability(branchService), PipelineStage.TRANSITION);

    // POST_TRANSITION
    runtime.register(new VersionBumpCapability(versionService), PipelineStage.POST_TRANSITION);
    runtime.register(new TagCapability(tagService), PipelineStage.POST_TRANSITION);
    runtime.register(new ChangelogCapability(changelogWriter), PipelineStage.POST_TRANSITION);

    // FINALIZE
    runtime.register(new PushCapability(this.git), PipelineStage.FINALIZE);
    runtime.register(new EventPublishCapability(eventBus), PipelineStage.FINALIZE);
    runtime.register(new PublishStartEventCapability(eventBus), PipelineStage.FINALIZE);

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
      versionService,
    );
    this.listBranchesHandler = new ListBranchesHandler(this.git);
    this.getStatusHandler = new GetStatusHandler(this.workflow, statusService);
    this.validateWorkflowHandler = new ValidateWorkflowHandler(configLoader);
    this.doctorHandler = new DoctorHandler(this.git, this.workflow);
    this.cleanupHandler = new CleanupHandler(this.git, this.workflow);
    this.updateBranchHandler = new UpdateBranchHandler(this.workflow, this.git, this.logger);

    this.kernel = new Kernel()
      .register(
        new StartModule(runtime, this.workflow, this.git, eventBus, stateStore, this.logger),
      )
      .register(
        new FinishModule(runtime, this.workflow, this.git, eventBus, stateStore, this.logger),
      )
      .register(
        new UpdateModule(runtime, this.workflow, this.git, eventBus, stateStore, this.logger),
      )
      .register(new ListBranchesModule(this.listBranchesHandler))
      .register(new StatusModule(this.getStatusHandler))
      .register(new ValidateWorkflowModule(this.validateWorkflowHandler))
      .register(new DoctorModule(this.doctorHandler))
      .register(new CleanupModule(this.cleanupHandler))
      .register(new VersionShowModule(versionService, "v"))
      .register(new VersionBumpModule(versionService));
  }

  getDefaultConfigPath(cwd: string): string | null {
    // ۱. در حالت توسعه (source code): به دنبال src/config/gitwe.json بگرد
    const devPath = path.join(cwd, "src/config/gitwe.json");
    if (fs.existsSync(devPath)) return devPath;

    // ۲. در حالت تولید (نصب شده از npm): به دنبال dist/config/gitwe.json بگرد
    // __dirname در فایل کامپایل شده به dist/cli اشاره دارد.
    const prodPath = path.join(__dirname, "../config/gitwe.json");
    if (fs.existsSync(prodPath)) return prodPath;

    return null;
  }
}
