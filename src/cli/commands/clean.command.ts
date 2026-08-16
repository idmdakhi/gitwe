import { Command } from "commander";
import { loadEngine, action } from "./shared.js";
import { style } from "../output.js";

/**
 * Report (or remove) a stale finish operation state file.
 * Does not delete branches or worktree files.
 */
export function cleanCommand(): Command {
  return new Command("clean")
    .description("remove a stale gitwe operation state file (does not touch branches)")
    .option("-f, --force", "actually delete the state file", false)
    .action(
      action(async function (this: Command, out) {
        const engine = await loadEngine(this);
        const opts = this.opts<{ force: boolean }>();
        const result = await engine.clean({ force: opts.force });

        if (!result.existed) {
          out.ok({
            data: result,
            message: "no operation state file present",
          });
          return;
        }

        if (result.removed) {
          out.ok({
            data: result,
            message: `removed stale state: ${result.path}`,
            details: [
              ...(result.operation
                ? [style.dim(`was: ${result.operation} @ ${result.currentStep ?? "?"}`)]
                : []),
            ],
          });
          return;
        }

        // Report only — tip to use --force
        out.ok({
          data: result,
          message: `stale operation state found: ${result.path}`,
          details: [
            ...(result.operation
              ? [
                  style.dim(
                    `operation=${result.operation}  step=${result.currentStep ?? "?"}  started=${result.startedAt ?? "?"}`,
                  ),
                ]
              : []),
            style.dim("re-run with --force to delete it"),
            style.dim("or: gitwe finish --continue  /  gitwe finish --abort"),
          ],
        });
      }),
    );
}
