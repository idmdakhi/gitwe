import { Command } from "commander";
import { createEngine } from "../context.js";
import type { GlobalOptions } from "../options.js";
import { printStructured, success } from "../output.js";

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

/**
 * Register `gitwe push` — push the current branch to the workflow remote.
 * For topic branches prefer `gitwe publish` (sets upstream).
 */
export function registerPush(program: Command, globals: () => GlobalOptions): void {
  program
    .command("push")
    .alias("publish")
    .description("push the current (or named) branch to the configured remote")
    .argument("[name]", "branch name (defaults to current branch)")
    .option("-u, --set-upstream", "set upstream tracking")
    .option("--tags", "also push tags")
    .option("-o, --push-option <option>", "push option (repeatable)", collect, [])
    .action(
      async (
        name: string | undefined,
        opts: { setUpstream?: boolean; tags?: boolean; pushOption?: string[] },
      ) => {
        const format = globals().format;
        const engine = await createEngine(globals());

        // Determine which branch to push
        const branch = name ?? (await engine.git.currentBranch());
        if (branch === undefined) {
          throw new Error("no branch specified and HEAD is detached");
        }
        if (!(await engine.git.branchExists(branch))) {
          throw new Error(`branch "${branch}" does not exist`);
        }

        const remote = engine.workflow.remoteName;
        await engine.git.push(remote, branch, {
          setUpstream: opts.setUpstream === true,
          followTags: opts.tags === true,
          pushOptions: opts.pushOption,
        });

        if (format === "json" || format === "yaml") {
          printStructured({ remote, branch, options: opts }, format!);
        } else {
          success(`pushed ${branch} to ${remote}`);
        }
      },
    );
}
