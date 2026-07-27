import type { KernelModule } from "../KernelModule";
import type { CapabilityRegistry, WorkflowContext } from "../Capability";
import type { FinishBranchHandler } from "#gitwe/application/handlers/FinishBranchHandler";
import type { FinishBranchCommand } from "#gitwe/application/commands/FinishBranchCommand";
import type { FinishBranchResult } from "#gitwe/application/dto/FinishBranchResult";
import type { Workflow } from "#gitwe/domain/aggregates/Workflow";
import type { GitRepository } from "#gitwe/domain/ports/GitRepository";
import type { EventBus } from "#gitwe/domain/ports/EventBus";
import type { StateStore } from "#gitwe/domain/ports/StateStore";
import type { Logger } from "#gitwe/shared/logging/Logger";

export class FinishModule implements KernelModule<FinishBranchCommand, FinishBranchResult> {
  readonly name = "finish";
  readonly description = "Finish a branch with optional versioning, tagging, and changelog";

  constructor(
    private readonly handler: FinishBranchHandler,
    private readonly capabilities: CapabilityRegistry,
    private readonly workflow: Workflow,
    private readonly git: GitRepository,
    private readonly eventBus: EventBus,
    private readonly stateStore: StateStore,
    private readonly logger: Logger,
  ) {}

  async execute(input: FinishBranchCommand): Promise<FinishBranchResult> {
    // 1. Build workflow context
    const context: WorkflowContext = {
      workflow: this.workflow,
      git: this.git,
      eventBus: this.eventBus,
      stateStore: this.stateStore,
      logger: this.logger,
      metadata: new Map(),
    };

    // 2. Run the main finish handler (merge, delete, etc.)
    const result = await this.handler.handle(input);

    // 3. Find the branch rule for versioning policy
    const rule = this.workflow.findRuleForBranch(input.branchName);
    if (!rule) return result;

    // 4. Determine if versioning is needed
    const bumpVersion = rule.bumpVersion ?? this.workflow.mergeStrategy;
    const shouldVersion = rule.autoTag && bumpVersion && bumpVersion !== "none";

    if (shouldVersion && !input.dryRun) {
      try {
        // 4a. Bump version using VersionCapability
        const versionResult = await this.capabilities.run<VersionInput, VersionOutput>(
          "version",
          {
            action: "bump",
            bumpKind: bumpVersion,
            dryRun: input.dryRun,
          },
          context,
        );

        // 4b. Create tag using TagCapability
        if (versionResult.tag) {
          await this.capabilities.run<TagInput, TagOutput>(
            "tag",
            {
              tag: versionResult.tag,
              message: `Release ${versionResult.tag}`,
              annotated: true,
              push: input.pushAfterFinish ?? false,
            },
            context,
          );
        }

        // 4c. Generate changelog using ChangelogCapability
        if (versionResult.next) {
          const version = Version.parse(versionResult.next);
          await this.capabilities.run<ChangelogInput, ChangelogOutput>(
            "changelog",
            {
              version,
              fromRef: versionResult.previous,
              toRef: "HEAD",
            },
            context,
          );
        }

        // Add version info to result (we'll need to extend the DTO)
        (result as any).version = versionResult.next;
        (result as any).tag = versionResult.tag;
      } catch (error) {
        this.logger.warn(
          `Versioning failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue; versioning failure shouldn't block the finish
      }
    }

    return result;
  }
}
