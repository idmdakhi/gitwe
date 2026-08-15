// import { Command } from "commander";
// import type { GlobalOptions } from "../options.js";
// import { printStructured, success } from "../output.js";
// import { loadEngine } from "./shared.js";

// /**
//  * Register `gitwe abort` — roll back an in-progress finish operation.
//  * Equivalent to `gitwe finish --abort`.
//  */
// export function registerAbortCommand(program: Command, globals: () => GlobalOptions): void {
//   program
//     .command("abort")
//     .description("abort an in-progress finish and restore the previous state")
//     .action(async () => {
//       const format = globals().format;
//       const engine = await loadEngine(this);
//       await engine.abortOperation();
//       if (format === "json" || format === "yaml") {
//         printStructured({ ok: true, action: "abort" }, format);
//       } else {
//         success("aborted; the repository is back to its previous state");
//       }
//     });
// }
