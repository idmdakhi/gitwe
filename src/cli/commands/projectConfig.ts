import type { Command } from "commander";
import { Container } from "#gitwe/cli/container";
import { printResult } from "#gitwe/cli/output";

/**
 * Exposes `GitweProjectConfigService` on the CLI: listing/rendering
 * templates, listing/checking review policies, and listing/switching the
 * active workflow discovered under `.gitwe/`.
 */
export function registerProjectConfigCommand(
  program: Command,
  getContainer: () => Container,
  getJson: () => boolean,
): void {
  const cmd = program.command("project-config").description("Inspect and customize .gitwe/ config");

  cmd
    .command("workflows")
    .description("List every workflow gitwe can resolve (built-in, custom, and the active one)")
    .action(() => {
      const { projectConfig } = getContainer();
      const names = projectConfig.listWorkflowNames();
      const active = projectConfig.getActiveWorkflowName();
      printResult(getJson(), { active, names }, (d) => {
        console.log(`Active workflow: ${d.active}`);
        console.log("Available:");
        for (const name of d.names)
          console.log(`  - ${name}${name === d.active ? " (active)" : ""}`);
      });
    });

  cmd
    .command("use <name>")
    .description("Switch the active workflow (in memory) and print the effective config")
    .option("-s, --save", "persist the change to the main gitwe.json/.yaml")
    .action((name: string, opts: { save?: boolean }) => {
      const { projectConfig } = getContainer();
      projectConfig.setActiveWorkflow(name);
      if (opts.save) projectConfig.save();
      printResult(getJson(), projectConfig.getEffectiveConfig(), (d) =>
        console.log(
          `Workflow set to "${name}"${opts.save ? " and saved." : " (not saved — pass --save to persist)."}\n`,
          d,
        ),
      );
    });

  cmd
    .command("templates")
    .description("List available templates under .gitwe/templates")
    .action(() => {
      const { projectConfig } = getContainer();
      const names = projectConfig.listTemplateNames();
      printResult(getJson(), { names }, (d) => {
        console.log(names.length ? "Templates:" : "No templates found in .gitwe/templates.");
        for (const name of d.names) console.log(`  - ${name}`);
      });
    });

  cmd
    .command("render-template <name> [vars...]")
    .description(
      'Render a template, e.g. "gitwe project-config render-template commit-template.txt scope=auth subject=fix"',
    )
    .action((name: string, vars: string[]) => {
      const { projectConfig } = getContainer();
      const variables: Record<string, string> = {};
      for (const pair of vars) {
        const [key, ...rest] = pair.split("=");
        if (key) variables[key] = rest.join("=");
      }
      const rendered = projectConfig.renderTemplate(name, variables);
      printResult(getJson(), { rendered }, (d) => console.log(d.rendered));
    });

  cmd
    .command("policies [branch]")
    .description("List review policies, or show the one that applies to [branch]")
    .action((branch?: string) => {
      const { projectConfig } = getContainer();
      const data = branch ? projectConfig.getPolicyForBranch(branch) : projectConfig.getPolicies();
      printResult(getJson(), data, () => {
        if (branch) {
          console.log(data ? data : `No review policy found for branch "${branch}".`);
          return;
        }
        const policies = data as ReturnType<typeof projectConfig.getPolicies>;
        if (!policies.length) {
          console.log("No review policies found in .gitwe/policies.");
          return;
        }
        for (const p of policies) {
          console.log(
            `  - ${p.branch}: requiredReviews=${p.requiredReviews ?? 0} ` +
              `requireStatusChecks=${p.requireStatusChecks ?? false}`,
          );
        }
      });
    });
}
