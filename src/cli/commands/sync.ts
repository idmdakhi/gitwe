// import { Command } from "commander";
// import { createEngine } from "../context.js";
// import type { GlobalOptions } from "../options.js";
// import { printStructured, success } from "../output.js";

// /**
//  * Register `gitwe sync` — fetch the remote and update the current topic branch
//  * from its parent (same as `gitwe update --fetch`).
//  */
// export function registerSyncCommand(program: Command, globals: () => GlobalOptions): void {
//   program
//     .command("sync")
//     .description("fetch the remote and update the current topic from its parent")
//     .option("--rebase", "rebase onto the parent instead of merging")
//     .action(async (opts: { rebase?: boolean }) => {
//       const format = globals().format;
//       const engine = await createEngine(globals());
//       const topic = await engine.currentBranchType();
//       const result = await engine.update(topic, { fetch: true, rebase: opts.rebase === true });
//       if (format === "json" || format === "yaml") {
//         printStructured(result, format);
//       } else if (result.alreadyUpToDate) {
//         success(`${result.branch} is already up to date with ${result.base}`);
//       } else {
//         success(`synced ${result.branch} from ${result.base} (${result.strategy})`);
//       }
//     });
// }
