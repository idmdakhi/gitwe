import { Command } from "commander";
import { loadEngine, action } from "./shared.js";

export function checkoutCommand(): Command {
  return new Command("checkout")
    .description("switch to a branch: full name, or topic type + short name / unique prefix")
    .argument("<type-or-branch>", "topic type (e.g. feature) or full branch name")
    .argument("[name]", "short name or unique prefix when the first arg is a type")
    .action(
      action(async function (this: Command, out, typeOrBranch: string, name: string | undefined) {
        const engine = await loadEngine(this);
        const result = await engine.checkout(typeOrBranch, name);

        out.ok({
          data: result,
          message: `switched to "${result.branch}"`,
        });
      }),
    );
}
