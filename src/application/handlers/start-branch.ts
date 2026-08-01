import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { EventBus } from "#gitwe/domain/ports/event-bus";
import type { Workflow } from "#gitwe/domain/aggregates/workflow";
import { RuleEvaluator } from "#gitwe/domain/services/rule-evaluator";
import { BranchStartedEvent } from "#gitwe/domain/events/branch-events";
import { BranchName } from "#gitwe/domain/valueObjects/branch-name";
import { UnknownBranchTypeError } from "#gitwe/domain/errors/index";
import type { StartBranchCommand } from "#gitwe/application/commands/start-branch";
import type { StartBranchResult } from "#gitwe/application/dto/results";

/**
 * Use case: create a new topic branch from its type's configured starting
 * point (or an explicit override) and check it out. Backs
 * `gitwe <type> start <name>`.
 *
 * @public
 */
export class StartBranchHandler {
  /**
   * @param workflow - The active workflow definition.
   * @param git - Port used to read and mutate repository state.
   * @param rules - Evaluates preconditions (naming policy, branch doesn't already exist, base branch exists) before mutating anything.
   * @param events - Port used to publish {@link BranchStartedEvent} after a successful start.
   */
  constructor(
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly rules: RuleEvaluator,
    private readonly events: EventBus,
  ) {}

  async handle(command: StartBranchCommand): Promise<StartBranchResult> {
    const rule = this.workflow.findBranchType(command.branchType);
    if (!rule) {
      throw new UnknownBranchTypeError(command.branchType, this.workflow.listBranchTypeNames());
    }

    const shortName = BranchName.fromShortName(command.shortName);
    const fullName = shortName.withPrefix(rule.prefix).toString();
    const baseBranch = command.from ?? rule.startingPoint;

    await this.rules.assertAllSatisfied({
      workflow: this.workflow,
      action: "start",
      branchName: fullName,
      baseBranch,
      git: this.git,
    });

    await this.git.createBranch(fullName, { from: baseBranch, checkout: true });
    await this.events.publish(new BranchStartedEvent(fullName, rule.name, baseBranch));

    return { branchName: fullName, baseBranch };
  }
}
