import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { WorkflowConfigStore } from "#gitwe/application/ports/workflow-config-store";
import { Workflow } from "#gitwe/domain/aggregates/workflow";
import { RemoteConfig } from "#gitwe/domain/valueObjects/remote-config";
import type { InitWorkflowCommand } from "#gitwe/application/commands/init-workflow";
import type { InitWorkflowResult } from "#gitwe/application/dto/results";

/**
 * Use case: define (or replace) the repository's workflow configuration
 * and, by default, create any declared base branches that don't yet exist
 * locally. Backs `gitwe init`.
 *
 * @public
 */
export class InitWorkflowHandler {
  constructor(
    private readonly git: GitRepository,
    private readonly configStore: WorkflowConfigStore,
  ) {}

  async handle(command: InitWorkflowCommand): Promise<InitWorkflowResult> {
    const workflow = Workflow.create({
      name: command.name,
      baseBranches: command.baseBranches,
      branchTypes: command.branchTypes,
      remote: RemoteConfig.create(command.remote !== undefined ? { remote: command.remote } : {}),
      ...(command.protectedBranches !== undefined
        ? { protectedBranches: command.protectedBranches }
        : {}),
    });

    await this.configStore.save(workflow);

    const createdBaseBranches: string[] = [];
    if (command.createMissingBaseBranches ?? true) {
      for (const base of workflow.baseBranches) {
        const exists = await this.git.branchExists(base.name);
        if (!exists) {
          await this.git.createBranch(base.name, { checkout: false });
          createdBaseBranches.push(base.name);
        }
      }
    }

    return { workflowName: workflow.name, createdBaseBranches };
  }
}
