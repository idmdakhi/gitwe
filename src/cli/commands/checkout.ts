// import { Command } from "commander";
// import { success, printStructured } from "../output.js";
// import type { GlobalOptions } from "../options.js";
// import { loadEngine } from "./shared.js";

// export function registerCheckoutCommand(program: Command, globals: () => GlobalOptions): void {
//   program
//     .command("checkout")
//     .description("switch to a topic branch (partial names allowed)")
//     .argument("<type>", "topic type (e.g. feature, release)")
//     .argument("<name>", "branch name or unique prefix")
//     .action(async (type: string, name: string) => {
//       const format = globals().format;
//       const engine = await loadEngine(this);

//       const topicType = engine.workflow.requireBranchType(type);
//       const branch = await engine.checkout(topicType, name);
//       const data = { branch };
//       if (format === "json" || format === "yaml") {
//         printStructured(data, format!);
//       } else {
//         success(`switched to ${branch}`);
//       }
//     });
// }
