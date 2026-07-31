import path from "node:path";
import fs from "node:fs";
import { Workflow } from "#gitwe/domain/aggregates/Workflow";
import { RuleEvaluator } from "#gitwe/domain/services/RuleEvaluator";
import { BranchDoesNotExistRule } from "#gitwe/domain/rules/BranchDoesNotExistRule";
import { BaseBranchExistsRule } from "#gitwe/domain/rules/BaseBranchExistsRule";
import { WorkingTreeCleanRule } from "#gitwe/domain/rules/WorkingTreeCleanRule";
import { BranchNamingRule } from "#gitwe/domain/rules/BranchNamingRule";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { Logger } from "#gitwe/shared/logging/logger";

import { ShellGitRepository } from "#gitwe/infrastructure/git/ShellGitRepository";
import { ShellHookRunner } from "#gitwe/infrastructure/hooks/ShellHookRunner";
import { InMemoryEventBus } from "#gitwe/infrastructure/events/InMemoryEventBus";
import { ConsoleLogger } from "#gitwe/infrastructure/logging/ConsoleLogger";
import { NoopLogger } from "#gitwe/infrastructure/logging/NoopLogger";
import { WorkflowConfigLoader } from "#gitwe/infrastructure/config/WorkflowConfigLoader";
import { builtInWorkflows, gitFlowWorkflow } from "#gitwe/infrastructure/config/BuiltInWorkflows";
import { GitweProjectConfigService } from "#gitwe/infrastructure/config/GitweProjectConfigService";

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

import { TransitionRuntime } from "#gitwe/kernel/pipeline/TransitionRuntime";
import { PipelineStage } from "#gitwe/kernel/pipeline/Stage";
import { PolicyEngine } from "#gitwe/kernel/policy/PolicyEngine";

// Capabilities
import { WorkingTreeCleanCapability } from "#gitwe/kernel/capabilities/validate/WorkingTreeCleanCapability";
import { BranchExistsCapability } from "#gitwe/kernel/capabilities/validate/BranchExistsCapability";
import { ProtectedBranchCapability } from "#gitwe/kernel/capabilities/validate/ProtectedBranchCapability";
import { MergeCapability } from "#gitwe/kernel/capabilities/transitions/MergeCapability";
import { DeleteBranchCapability } from "#gitwe/kernel/capabilities/transitions/DeleteBranchCapability";
import { CreateBranchCapability } from "#gitwe/kernel/capabilities/transitions/CreateBranchCapability";
import { VersionBumpCapability } from "#gitwe/kernel/capabilities/post/VersionBumpCapability";
import { TagCapability } from "#gitwe/kernel/capabilities/post/TagCapability";
import { ChangelogCapability } from "#gitwe/kernel/capabilities/post/ChangelogCapability";
import { PushCapability } from "#gitwe/kernel/capabilities/finalize/PushCapability";
import { EventPublishCapability } from "#gitwe/kernel/capabilities/finalize/EventPublishCapability";

import { StartModule } from "#gitwe/kernel/modules/StartModule";
import { FinishModule } from "#gitwe/kernel/modules/FinishModule";
import { UpdateModule } from "#gitwe/kernel/modules/UpdateModule";
import { RuleValidationCapability } from "#gitwe/kernel/capabilities/validate/RuleValidationCapability";
import { PublishStartEventCapability } from "#gitwe/kernel/capabilities/finalize/PublishStartEventCapability";
import { NoopStateStore } from "#gitwe/infrastructure/state/NoopStateStore";
import type { StateStore } from "#gitwe/domain/ports/StateStore";

// Types for public API
import { StartBranchCommand } from "#gitwe/application/commands/StartBranchCommand";
import { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import { UpdateBranchCommand } from "#gitwe/application/commands/UpdateBranchCommand";
import { GetStatusQuery } from "#gitwe/application/queries/GetStatusQuery";
import type { StartBranchResult } from "#gitwe/application/dto/StartBranchResult";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";
import type { UpdateBranchResult } from "#gitwe/application/dto/UpdateBranchResult";
import type { StatusReport } from "#gitwe/application/dto/StatusReport";
import type { BranchSummaryDto } from "#gitwe/application/dto/StatusReport";
import type { MergeStrategy } from "#gitwe/domain/valueObjects/MergeStrategy";
import type { UpdateStrategy } from "#gitwe/domain/valueObjects/UpdateStrategy";

export interface ContainerOptions {
  /** مسیر فایل پیکربندی (JSON/YAML) */
  configPath?: string;
  /** نام گردش‌کار داخلی (git-flow, github-flow, trunk-based) */
  workflow?: string | undefined;
  /** دایرکتوری کاری (پیش‌فرض: process.cwd()) */
  cwd?: string;
  /** غیرفعال کردن لاگ‌های اطلاعاتی */
  quiet?: boolean;
  /** لاگر سفارشی */
  logger?: Logger;
}

/**
 * نقطه ورود اصلی کتابخانه gitwe
 *
 * @example
 * ```typescript
 * import { Container } from "gitwe";
 *
 * const container = new Container({ workflow: "git-flow" });
 * await container.startBranch("feature", "login-page");
 * ```
 */
export class Container {
  readonly workflow: Workflow;
  readonly projectConfig: GitweProjectConfigService;
  readonly git: GitRepository;
  readonly logger: Logger;
  readonly kernel: Kernel;

  // Handlers (برای استفاده پیشرفته)
  readonly startBranchHandler: StartBranchHandler;
  readonly finishBranchHandler: FinishBranchHandler;
  readonly listBranchesHandler: ListBranchesHandler;
  readonly getStatusHandler: GetStatusHandler;
  readonly validateWorkflowHandler: ValidateWorkflowHandler;
  readonly doctorHandler: DoctorHandler;
  readonly cleanupHandler: CleanupHandler;
  readonly updateBranchHandler: UpdateBranchHandler;

  constructor(options: ContainerOptions = {}) {
    const cwd = options.cwd ?? process.cwd();
    this.logger = options.logger ?? (options.quiet ? new NoopLogger() : new ConsoleLogger());

    // بارگذاری workflow
    this.projectConfig = new GitweProjectConfigService({ rootDir: cwd, logger: this.logger });
    const configLoader = new WorkflowConfigLoader();
    let workflow: Workflow;

    if (options.configPath) {
      workflow = configLoader.load(path.resolve(cwd, options.configPath));
    } else if (options.workflow) {
      workflow = builtInWorkflows[options.workflow] ?? gitFlowWorkflow;
    } else {
      // بررسی .gitwe
      const data = this.projectConfig.load();
      if (data.configPath) {
        workflow = this.projectConfig.getWorkflow();
      } else {
        // فایل‌های پیش‌فرض (src/config یا dist/config)
        const defaultPath = this.getDefaultConfigPath(cwd);
        workflow = defaultPath ? configLoader.load(defaultPath) : gitFlowWorkflow;
      }
    }

    this.workflow = workflow;
    this.git = new ShellGitRepository(cwd, this.logger);

    // مقداردهی وابستگی‌ها
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

    // Version Service
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

    // Policy Engine & Runtime
    const policyEngine = new PolicyEngine(this.workflow);
    policyEngine.loadFromConfig();
    const runtime = new TransitionRuntime({ failFast: true, continueOnFailure: false });
    runtime.setPolicyEngine(policyEngine);

    // ثبت Capabilityها
    this.registerCapabilities(runtime, ruleEvaluator, mergeService, tagService, versionService);

    // Handlers
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
      versionService,
    );

    this.listBranchesHandler = new ListBranchesHandler(this.git);
    this.getStatusHandler = new GetStatusHandler(this.workflow, statusService);
    this.validateWorkflowHandler = new ValidateWorkflowHandler(configLoader);
    this.doctorHandler = new DoctorHandler(this.git, this.workflow);
    this.cleanupHandler = new CleanupHandler(this.git, this.workflow);
    this.updateBranchHandler = new UpdateBranchHandler(this.workflow, this.git, this.logger);

    // Kernel
    const stateStore: StateStore = new NoopStateStore();
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

  private registerCapabilities(
    runtime: TransitionRuntime,
    ruleEvaluator: RuleEvaluator,
    mergeService: MergeService,
    tagService: TagService,
    versionService: VersionService,
  ): void {
    runtime.register(new WorkingTreeCleanCapability(), PipelineStage.VALIDATE);
    runtime.register(new BranchExistsCapability(), PipelineStage.VALIDATE);
    runtime.register(new ProtectedBranchCapability(), PipelineStage.VALIDATE);
    runtime.register(new RuleValidationCapability(ruleEvaluator), PipelineStage.VALIDATE);

    runtime.register(new MergeCapability(mergeService), PipelineStage.TRANSITION);
    runtime.register(new DeleteBranchCapability(this.git), PipelineStage.TRANSITION);
    runtime.register(
      new CreateBranchCapability(new BranchService(this.git, ruleEvaluator)),
      PipelineStage.TRANSITION,
    );

    runtime.register(new VersionBumpCapability(versionService), PipelineStage.POST_TRANSITION);
    runtime.register(new TagCapability(tagService), PipelineStage.POST_TRANSITION);
    runtime.register(
      new ChangelogCapability(new ConventionalChangelogWriter(this.git, this.logger)),
      PipelineStage.POST_TRANSITION,
    );

    runtime.register(new PushCapability(this.git), PipelineStage.FINALIZE);
    runtime.register(
      new EventPublishCapability(new InMemoryEventBus(this.logger)),
      PipelineStage.FINALIZE,
    );
    runtime.register(
      new PublishStartEventCapability(new InMemoryEventBus(this.logger)),
      PipelineStage.FINALIZE,
    );
  }

  private getDefaultConfigPath(cwd: string): string | null {
    const devPath = path.join(cwd, "src/config/gitwe.json");
    if (fs.existsSync(devPath)) return devPath;

    const prodPath = path.join(cwd, "..gitwe/gitwe.json");
    if (fs.existsSync(prodPath)) return prodPath;

    const prodPathMain = path.join(cwd, "gitwe.json");
    if (fs.existsSync(prodPathMain)) return prodPathMain;

    return null;
  }

  // ===== Public API Methods =====

  /** شروع یک شاخه جدید */
  async startBranch(type: string, name: string): Promise<StartBranchResult> {
    return this.kernel.run<StartBranchCommand, StartBranchResult>("start", {
      branchType: type,
      shortName: name,
    });
  }

  /** پایان یک شاخه */
  async finishBranch(
    branchName: string,
    options: {
      deleteAfterMerge?: boolean;
      pushAfterFinish?: boolean;
      dryRun?: boolean;
      strategy?: MergeStrategy;
    } = {},
  ): Promise<FinishBranchResult> {
    return this.kernel.run<FinishBranchCommand, FinishBranchResult>("finish", {
      branchName,
      ...options,
    });
  }

  /** دریافت وضعیت مخزن */
  async getStatus(rootBranch: string = "main"): Promise<StatusReport> {
    return this.kernel.run<GetStatusQuery, StatusReport>("status", { rootBranch });
  }

  /** دریافت لیست شاخه‌های محلی */
  async listBranches(): Promise<BranchSummaryDto[]> {
    return this.kernel.run<void, BranchSummaryDto[]>("list", undefined);
  }

  /** به‌روزرسانی یک شاخه با تغییرات از شاخه پایه */
  async updateBranch(branchName: string, strategy?: UpdateStrategy): Promise<UpdateBranchResult> {
    return this.kernel.run<UpdateBranchCommand, UpdateBranchResult>("update", {
      branchName,
      strategy,
    });
  }

  /** اجرای یک ماژول دلخواه از طریق کرنل (استفاده پیشرفته) */
  async run<TInput, TOutput>(moduleName: string, input: TInput): Promise<TOutput> {
    return this.kernel.run<TInput, TOutput>(moduleName, input);
  }

  /** دریافت گردش‌کار فعلی */
  getWorkflow(): Workflow {
    return this.workflow;
  }

  /** دریافت Git Repository Adapter */
  getGit(): GitRepository {
    return this.git;
  }
}
