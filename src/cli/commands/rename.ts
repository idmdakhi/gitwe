// import { Command } from "commander";
// import { createEngine } from "../context.js";
// import { success, printStructured } from "../output.js";
// import type { GlobalOptions } from "../options.js";

// export function registerRenameCommand(program: Command, globals: () => GlobalOptions): void {
//   program
//     .command("rename")
//     .description("rename the current topic branch")
//     .argument("<new-name>")
//     .action(async (newName: string) => {
//       const engine = await createEngine(globals());
//       const topic = await engine.currentBranchType();
//       const renamed = await engine.rename(topic, newName);
//       const format = globals().format;
//       const data = { old: topic.branch, new: renamed };
//       if (format === "json" || format === "yaml") {
//         printStructured(data, format!);
//       } else {
//         success(`renamed ${topic.branch} → ${renamed}`);
//       }
//     });
// }
