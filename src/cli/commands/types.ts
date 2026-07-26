import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";
import { printResult } from "#gitwe/cli/output";

export function registerTypesCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  program
    .command("types")
    .description("List the branch types defined by the active workflow")
    .action(() => {
      const container = getContainer();
      const rules = container.workflow.branchTypes.map((rule) => ({
        name: rule.name,
        prefix: rule.prefix,
        baseBranch: rule.baseBranch,
        mergeTargets: rule.mergeTargets,
        autoTag: Boolean(rule.autoTag),
      }));
      printResult(getJson(), rules, (list) => {
        for (const rule of list) {
          const tag = rule.autoTag ? " (auto-tags)" : "";
          console.log(
            `${rule.name.padEnd(12)} prefix="${rule.prefix}"  base="${rule.baseBranch}"  merges into: ${rule.mergeTargets.join(", ")}${tag}`,
          );
        }
      });
    });
}
