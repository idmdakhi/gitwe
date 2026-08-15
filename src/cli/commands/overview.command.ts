import { Command } from "commander";
import { loadEngine, action, globalOptions } from "./shared.js";
import { print, printStructured, style } from "../output.js";

export function overviewCommand(): Command {
  return new Command("overview")
    .alias("status")
    .description("show the workflow definition and branch counts")
    .action(
      action(async function (this: Command) {
        const engine = await loadEngine(this);
        const format = globalOptions(this).format;
        const overview = await engine.overview();

        if (format === "json" || format === "yaml") {
          printStructured(overview, format, { command: "overview" });
          return;
        }

        print(`${style.bold("Workflow")}  ${overview.workflowName}`);
        print(`${style.dim("branch")}    ${overview.currentBranch ?? "(detached)"}`);
        print();
        print(style.bold("Base branches"));
        for (const name of overview.baseBranches) {
          print(`  ${style.cyan(name)}`);
        }
        print();
        print(style.bold("Topic types"));
        for (const t of overview.branchTypes) {
          print(
            `  ${style.cyan(t.type.padEnd(10))} base=${t.base.padEnd(10)} ` +
              `target=[${t.target.join(", ")}]  count=${t.count}`,
          );
        }
      }),
    );
}
