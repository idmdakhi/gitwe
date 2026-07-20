import type { Command } from "commander";
import type { Container } from "#gitwe/cli/container";

export function registerTypesCommand(program: Command, getContainer: () => Container): void {
  program
    .command("types")
    .description("List the branch types defined by the active workflow")
    .action(() => {
      const container = getContainer();
      for (const rule of container.workflow.branchTypes) {
        const tag = rule.autoTag ? " (auto-tags)" : "";
        console.log(
          `${rule.name.padEnd(12)} prefix="${rule.prefix}"  base="${rule.baseBranch}"  merges into: ${rule.mergeTargets.join(", ")}${tag}`,
        );
      }
    });
}
