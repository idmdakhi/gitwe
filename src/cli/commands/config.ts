import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";

export function registerConfigCommand(program: Command, getContainer: () => Container): void {
  program
    .command("config")
    .description("Print the resolved active workflow configuration")
    .action(() => {
      const container = getContainer();
      const w = container.workflow;
      console.log(`Workflow: ${w.name}`);
      console.log(
        `Remote: ${w.remote.remote} (autoPush=${w.remote.autoPush}, autoPull=${w.remote.autoPull})`,
      );
      console.log("Branch types:");
      for (const rule of w.branchTypes) {
        console.log(
          `  - ${rule.name}: prefix="${rule.prefix}" base="${rule.baseBranch}" ` +
            `mergeTargets=[${rule.mergeTargets.join(", ")}] deleteOnFinish=${rule.deleteOnFinish}`,
        );
      }
    });
}
