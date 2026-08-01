import { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { Workflow } from "#gitwe/domain/aggregates/workflow";
import { BaseBranchRule } from "#gitwe/domain/valueObjects/base-branch-rule";
import { BranchTypeRule } from "#gitwe/domain/valueObjects/branch-type-rule";
import type { UpdateStrategy, MergeStrategy } from "#gitwe/domain/valueObjects/merge-strategy";
import { success, info, style } from "#gitwe/cli/format";

/**
 * Registers `gitwe config <add-base|add-topic|show>`, for building or
 * inspecting a fully custom workflow incrementally — the CLI-native
 * alternative to hand-editing `gitwe.json`.
 *
 * @internal
 */
export function registerConfigCommands(program: Command, container: Container): void {
  const config = program.command("config").description("Inspect or extend the workflow configuration");

  config
    .command("show")
    .description("Print the active workflow configuration")
    .action(async () => {
      const { workflow } = await container.forWorkflow();
      info(style.bold(`Workflow: ${workflow.name}`));
      info("");
      info(style.bold("Base branches:"));
      for (const base of workflow.baseBranches) {
        const parent = base.parent ? ` <- ${base.parent} (${base.downstreamStrategy}${base.autoUpdate ? ", auto-update" : ""})` : "";
        info(`  ${base.name}${parent}`);
      }
      info("");
      info(style.bold("Branch types:"));
      for (const type of workflow.branchTypes) {
        info(
          `  ${type.name.padEnd(12)} prefix=${type.prefix.padEnd(12)} -> ${type.parent} (${type.upstreamStrategy}, start=${type.startingPoint})`,
        );
      }
    });

  config
    .command("add-base <name>")
    .description("Declare a new long-lived base branch")
    .option("--parent <name>", "base branch this one syncs from")
    .option("--downstream-strategy <strategy>", "merge|rebase", "merge")
    .option("--auto-update", "automatically sync from --parent whenever it changes", false)
    .action(
      async (
        name: string,
        options: { parent?: string; downstreamStrategy: UpdateStrategy; autoUpdate: boolean },
      ) => {
        const { workflow } = await container.forWorkflow();
        const updated = Workflow.create({
          name: workflow.name,
          remote: workflow.remote,
          branchNaming: workflow.branchNaming,
          protectedBranches: [...workflow.protectedBranches],
          baseBranches: [
            ...workflow.baseBranches,
            BaseBranchRule.create({
              name,
              ...(options.parent !== undefined ? { parent: options.parent } : {}),
              downstreamStrategy: options.downstreamStrategy,
              autoUpdate: options.autoUpdate,
            }),
          ],
          branchTypes: [...workflow.branchTypes],
        });
        await container.configStore.save(updated);
        success(`Added base branch "${name}".`);
      },
    );

  config
    .command("add-topic <name> <prefix> <parent>")
    .description("Declare a new topic (short-lived) branch type, e.g. add-topic feature feature/ develop")
    .option("--starting-point <base>", "base branch to create instances from (defaults to <parent>)")
    .option("--upstream-strategy <strategy>", "merge|squash|rebase", "merge")
    .option("--tag", "create a tag on finish", false)
    .option("--tag-prefix <prefix>", "tag prefix", "v")
    .option("--no-delete-on-finish", "keep the branch after finishing")
    .action(
      async (
        name: string,
        prefix: string,
        parent: string,
        options: {
          startingPoint?: string;
          upstreamStrategy: MergeStrategy;
          tag: boolean;
          tagPrefix: string;
          deleteOnFinish: boolean;
        },
      ) => {
        const { workflow } = await container.forWorkflow();
        const updated = Workflow.create({
          name: workflow.name,
          remote: workflow.remote,
          branchNaming: workflow.branchNaming,
          protectedBranches: [...workflow.protectedBranches],
          baseBranches: [...workflow.baseBranches],
          branchTypes: [
            ...workflow.branchTypes,
            BranchTypeRule.create({
              name,
              prefix,
              parent,
              ...(options.startingPoint !== undefined ? { startingPoint: options.startingPoint } : {}),
              upstreamStrategy: options.upstreamStrategy,
              deleteOnFinish: options.deleteOnFinish,
              autoTag: { enabled: options.tag, prefix: options.tagPrefix },
            }),
          ],
        });
        await container.configStore.save(updated);
        success(`Added branch type "${name}" (${prefix}*).`);
        info(style.dim(`Run "gitwe ${name} start <short-name>" to use it.`));
      },
    );
}
