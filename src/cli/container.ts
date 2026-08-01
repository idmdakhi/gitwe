import { ShellGitRepository } from "#gitwe/infrastructure/git/shell-git-repository";
import { FileWorkflowConfigStore } from "#gitwe/infrastructure/config/file-workflow-config-store";
import { InMemoryEventBus } from "#gitwe/infrastructure/events/in-memory-event-bus";
import { ConsoleLogger } from "#gitwe/infrastructure/logging/console-logger";
import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { EventBus } from "#gitwe/domain/ports/event-bus";
import type { Logger } from "#gitwe/shared/logging/logger";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import { RuleEvaluator } from "#gitwe/domain/services/rule-evaluator";
import { BranchDoesNotExistRule } from "#gitwe/domain/rules/branch-does-not-exist";
import { BranchExistsRule } from "#gitwe/domain/rules/branch-exists";
import { BaseBranchExistsRule } from "#gitwe/domain/rules/base-branch-exists";
import { BranchNamingRule } from "#gitwe/domain/rules/branch-naming";
import { WorkingTreeCleanRule } from "#gitwe/domain/rules/working-tree-clean";
import { NotProtectedRule } from "#gitwe/domain/rules/not-protected";
import { BranchResolver } from "#gitwe/application/services/branch-resolver";
import { StatusService } from "#gitwe/application/services/status-service";
import { StartBranchHandler } from "#gitwe/application/handlers/start-branch";
import { FinishBranchHandler } from "#gitwe/application/handlers/finish-branch";
import { UpdateBranchHandler } from "#gitwe/application/handlers/update-branch";
import { DeleteBranchHandler } from "#gitwe/application/handlers/delete-branch";
import { PublishBranchHandler } from "#gitwe/application/handlers/publish-branch";
import { TrackBranchHandler } from "#gitwe/application/handlers/track-branch";
import { RenameBranchHandler } from "#gitwe/application/handlers/rename-branch";
import { CheckoutBranchHandler } from "#gitwe/application/handlers/checkout-branch";
import { ListBranchesHandler } from "#gitwe/application/handlers/list-branches";
import { GetStatusHandler } from "#gitwe/application/handlers/get-status";
import { InitWorkflowHandler } from "#gitwe/application/handlers/init-workflow";
import { InvalidWorkflowDefinitionError } from "#gitwe/domain/errors/index";

/**
 * Every use-case handler wired up and ready to call, for a single loaded
 * {@link Workflow}. Built by {@link Container.forWorkflow}.
 *
 * @public
 */
export interface WorkflowHandlers {
  readonly workflow: Workflow;
  readonly start: StartBranchHandler;
  readonly finish: FinishBranchHandler;
  readonly update: UpdateBranchHandler;
  readonly delete: DeleteBranchHandler;
  readonly publish: PublishBranchHandler;
  readonly track: TrackBranchHandler;
  readonly rename: RenameBranchHandler;
  readonly checkout: CheckoutBranchHandler;
  readonly list: ListBranchesHandler;
  readonly status: GetStatusHandler;
  readonly resolver: BranchResolver;
}

/**
 * Composition root for the CLI: constructs every infrastructure adapter
 * once, then wires application handlers against a loaded {@link Workflow}
 * on demand. This is the only place in the package that imports concrete
 * infrastructure classes directly instead of depending on domain ports —
 * every other layer depends only on interfaces.
 *
 * @public
 */
export class Container {
  readonly git: GitRepository;
  readonly events: EventBus;
  readonly logger: Logger;
  readonly configStore: FileWorkflowConfigStore;

  constructor(cwd: string = process.cwd()) {
    this.git = new ShellGitRepository(cwd);
    this.events = new InMemoryEventBus();
    this.logger = new ConsoleLogger();
    this.configStore = new FileWorkflowConfigStore(cwd);
  }

  /** The default rule set applied to every workflow action. */
  private buildRuleEvaluator(): RuleEvaluator {
    return new RuleEvaluator([
      new BranchDoesNotExistRule(),
      new BranchExistsRule(),
      new BaseBranchExistsRule(),
      new BranchNamingRule(),
      new WorkingTreeCleanRule(),
      new NotProtectedRule(),
    ]);
  }

  /**
   * Loads the active workflow configuration and wires up every handler
   * against it.
   *
   * @throws {InvalidWorkflowDefinitionError} If no configuration exists yet — run `gitwe init` first.
   */
  async forWorkflow(): Promise<WorkflowHandlers> {
    const workflow = await this.configStore.load();
    const rules = this.buildRuleEvaluator();
    const resolver = new BranchResolver(this.git);
    const statusService = new StatusService(this.git);

    return {
      workflow,
      start: new StartBranchHandler(workflow, this.git, rules, this.events),
      finish: new FinishBranchHandler(workflow, this.git, rules, this.events),
      update: new UpdateBranchHandler(workflow, this.git, rules),
      delete: new DeleteBranchHandler(workflow, this.git, rules),
      publish: new PublishBranchHandler(workflow, this.git, rules, this.events),
      track: new TrackBranchHandler(workflow, this.git, resolver),
      rename: new RenameBranchHandler(workflow, this.git, rules),
      checkout: new CheckoutBranchHandler(workflow, this.git, resolver),
      list: new ListBranchesHandler(workflow, this.git),
      status: new GetStatusHandler(workflow, statusService),
      resolver,
    };
  }

  /** Wires up {@link InitWorkflowHandler}, the one handler that runs before a workflow config exists. */
  initHandler(): InitWorkflowHandler {
    return new InitWorkflowHandler(this.git, this.configStore);
  }
}

export { InvalidWorkflowDefinitionError };
