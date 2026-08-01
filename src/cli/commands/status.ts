import { Command } from "commander";
import type { WorkflowHandlers } from "#gitwe/cli/container";
import { info, style } from "#gitwe/cli/format";

/**
 * Registers `gitwe status` (aliased `overview`): a repository-wide
 * summary of the active workflow and its topic branches.
 *
 * @internal
 */
export function registerStatusCommand(program: Command, handlers: WorkflowHandlers): void {
  const action = async () => {
    const report = await handlers.status.handle();

    info(style.bold(`Workflow: ${report.workflowName}`));
    info(`Current branch: ${style.cyan(report.currentBranch)}`);
    info(`Base branches: ${report.baseBranches.join(", ")}`);
    info("");

    if (report.topicBranches.length === 0) {
      info(style.dim("No topic branches."));
      return;
    }

    for (const type of report.branchTypes) {
      const branchesOfType = report.topicBranches.filter((b) => b.type === type);
      if (branchesOfType.length === 0) continue;
      info(style.bold(type));
      for (const b of branchesOfType) {
        const marker = b.isCurrent ? style.green("*") : " ";
        info(`  ${marker} ${b.name}${b.hasUpstream ? "" : style.dim("  (not published)")}`);
      }
    }
  };

  program.command("status").alias("overview").description("Show workflow status").action(action);
}
