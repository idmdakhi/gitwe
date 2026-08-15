// import { Command } from "commander";
// import { createEngine } from "../context.js";
// import { print, style, success, printStructured } from "../output.js";
// import type { GlobalOptions } from "../options.js";

// export function registerRebaseCommand(program: Command, globals: () => GlobalOptions): void {
//   program
//     .command("rebase")
//     .description("update the current (or named) topic branch by rebasing")
//     .argument("[name]")
//     .action(async (name: string | undefined) => {
//       const engine = await createEngine(globals());
//       const topic = await engine.resolveTarget(undefined, name);
//       const result = await engine.update(topic, { rebase: true });
//       const format = globals().format;
//       if (format === "json" || format === "yaml") {
//         printStructured(result, format!);
//       } else if (result.alreadyUpToDate) {
//         print(style.dim(`${result.branch} is already up to date`));
//       } else {
//         success(`rebased ${result.branch} onto ${result.base}`);
//       }
//     });
// }
