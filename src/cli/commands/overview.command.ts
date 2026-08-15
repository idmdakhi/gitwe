import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function overviewCommand(): Command {
  return new Command("overview")
    .alias("status")
    .description("show the workflow definition and branch counts")
    .action(
      action(async function (this: Command) {
        const engine = await loadEngine(this);
        const overview = await engine.overview();
        console.log(`workflow: ${overview.workflowName}`);
        console.log(`current branch: ${overview.currentBranch ?? "(detached)"}`);
        console.log(`base branches: ${overview.baseBranches.join(", ")}`);
        console.log("branch types:");
        for (const t of overview.branchTypes) {
          console.log(`  ${t.type.padEnd(10)} base=${t.base.padEnd(10)} target=[${t.target.join(", ")}]  count=${t.count}`);
        }
      }),
    );
}
