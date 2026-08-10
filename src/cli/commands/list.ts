import { Command } from "commander";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { print, style, printStructured } from "../output.js";
import { BranchStatus } from "../../domain/entities.js";

export function registerList(program: Command, globals: () => GlobalOptions): void {
  program
    .command("list")
    .description("list branches of a given type (or all if no type given)")
    .argument("[type]", "branch type (e.g. feature, release); omit to list all")
    .argument("[pattern]", "shell-style glob applied to the short name")
    .action(async (type: string | undefined, pattern: string | undefined) => {
      const format = globals().format;
      const engine = await createEngine(globals());

      if (type !== undefined) {
        const branchType = engine.workflow.requireBranchType(type);
        const branches = await engine.listBranchTypes(branchType, pattern);
        await printBranches(type, branches, format);
        return;
      }

      // No type: list all branch types
      const allTypes = engine.workflow.branchTypes;
      if (allTypes.length === 0) {
        print(style.dim("no branch types defined in the workflow"));
        return;
      }

      const results: Array<{ type: string; branches: BranchStatus[] }> = [];
      for (const bt of allTypes) {
        const branches = await engine.listBranchTypes(bt, pattern);
        if (branches.length > 0) {
          results.push({ type: bt.name, branches });
        }
      }

      if (results.length === 0) {
        print(style.dim("no branches found"));
        return;
      }

      if (format === "json" || format === "yaml") {
        printStructured(results, format!);
        return;
      }

      for (const result of results) {
        print(style.bold(style.cyan(`${result.type}:`)));
        for (const branch of result.branches) {
          const marks: string[] = [];
          if (branch.ahead > 0) marks.push(`↑${branch.ahead}`);
          if (branch.behind > 0) marks.push(`↓${branch.behind}`);
          if (branch.upstream !== undefined) marks.push(branch.upstream);
          print(
            `  ${branch.current ? style.green("* ") : "  "}${branch.name}` +
              (marks.length > 0 ? ` ${style.dim(`(${marks.join(", ")})`)}` : ""),
          );
        }
        print();
      }
    });
}

// Helper function
async function printBranches(
  type: string,
  branches: BranchStatus[],
  format?: "text" | "json" | "yaml" | "table",
): Promise<void> {
  if (format === "json" || format === "yaml") {
    printStructured({ type, branches }, format!);
    return;
  }
  if (branches.length === 0) {
    print(style.dim(`no ${type} branches`));
    return;
  }
  for (const branch of branches) {
    const marks: string[] = [];
    if (branch.ahead > 0) marks.push(`↑${branch.ahead}`);
    if (branch.behind > 0) marks.push(`↓${branch.behind}`);
    if (branch.upstream !== undefined) marks.push(branch.upstream);
    print(
      `${branch.current ? style.green("* ") : "  "}${branch.name}` +
        (marks.length > 0 ? ` ${style.dim(`(${marks.join(", ")})`)}` : ""),
    );
  }
}
