import { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { BUILT_IN_WORKFLOWS, BUILT_IN_WORKFLOW_NAMES, type BuiltInWorkflowName } from "#gitwe/infrastructure/config/built-in-workflows";
import { InitWorkflowHandler } from "#gitwe/application/handlers/init-workflow";
import { success, info, style } from "#gitwe/cli/format";

function isBuiltInName(value: string): value is BuiltInWorkflowName {
  return (BUILT_IN_WORKFLOW_NAMES as readonly string[]).includes(value);
}

/**
 * Registers `gitwe init [--preset <name>]`, which writes a
 * `gitwe.json` config from a built-in preset and creates any base
 * branches that don't exist yet locally.
 *
 * A fully custom workflow can be built afterward with
 * `gitwe config add-base` / `gitwe config add-topic`, or by hand-editing
 * the generated `gitwe.json`.
 *
 * @internal
 */
export function registerInitCommand(program: Command, container: Container): void {
  program
    .command("init")
    .description("Set up the workflow configuration for this repository")
    .option(
      "-p, --preset <name>",
      `built-in workflow to start from (${BUILT_IN_WORKFLOW_NAMES.join(", ")})`,
      "gitflow",
    )
    .option("--no-create-branches", "don't create missing base branches locally")
    .action(async (options: { preset: string; createBranches: boolean }) => {
      if (!isBuiltInName(options.preset)) {
        throw new Error(
          `Unknown preset "${options.preset}". Available: ${BUILT_IN_WORKFLOW_NAMES.join(", ")}`,
        );
      }

      const preset = BUILT_IN_WORKFLOWS[options.preset]();
      const handler: InitWorkflowHandler = container.initHandler();
      const result = await handler.handle({
        name: preset.name,
        baseBranches: [...preset.baseBranches],
        branchTypes: [...preset.branchTypes],
        remote: preset.remote.remote,
        createMissingBaseBranches: options.createBranches,
      });

      success(`Initialized "${result.workflowName}" workflow (gitwe.json).`);
      if (result.createdBaseBranches.length > 0) {
        info(`Created base branches: ${style.cyan(result.createdBaseBranches.join(", "))}`);
      }
      info(`Branch types: ${style.cyan(preset.listBranchTypeNames().join(", "))}`);
    });
}
