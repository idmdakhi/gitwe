import type { Command } from "commander";
import type { Container } from "../container";
import { printResult } from "../output";

export function registerConfigCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("config")
    .description("Print the resolved active workflow configuration")
    .action(() => {
      const container = getContainer();
      const w = container.workflow;
      const data = {
        name: w.name,
        remote: { remote: w.remote.remote, autoPush: w.remote.autoPush, autoPull: w.remote.autoPull },
        branchTypes: w.branchTypes.map((rule) => ({
          name: rule.name,
          prefix: rule.prefix,
          baseBranch: rule.baseBranch,
          mergeTargets: rule.mergeTargets,
          deleteOnFinish: rule.deleteOnFinish,
        })),
      };
      printResult(getJson(), data, (d) => {
        console.log(`Workflow: ${d.name}`);
        console.log(`Remote: ${d.remote.remote} (autoPush=${d.remote.autoPush}, autoPull=${d.remote.autoPull})`);
        console.log("Branch types:");
        for (const rule of d.branchTypes) {
          console.log(
            `  - ${rule.name}: prefix="${rule.prefix}" base="${rule.baseBranch}" ` +
              `mergeTargets=[${rule.mergeTargets.join(", ")}] deleteOnFinish=${rule.deleteOnFinish}`,
          );
        }
      });
    });
}
