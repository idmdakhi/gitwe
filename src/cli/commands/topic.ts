import { Command } from "commander";
import type { WorkflowHandlers } from "#gitwe/cli/container";
import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { MergeStrategy, UpdateStrategy } from "#gitwe/domain/valueObjects/merge-strategy";
import { resolveBranchArg } from "#gitwe/cli/commands/topic-helpers";
import { success, info, style } from "#gitwe/cli/format";

/**
 * Registers one `gitwe <type>` command group — `start`, `finish`,
 * `update`, `list`, `publish`, `track`, `rename`, `checkout`, `delete` —
 * for every topic branch type declared in the active workflow. This is
 * what makes branch types fully configurable: the CLI's surface is
 * generated from `workflow.branchTypes`, not hardcoded to `feature`/
 * `release`/`hotfix`.
 *
 * @internal
 */
export function registerTopicCommands(program: Command, handlers: WorkflowHandlers, git: GitRepository): void {
  for (const rule of handlers.workflow.branchTypes) {
    const group = program.command(rule.name).description(`Manage "${rule.name}" branches (${rule.prefix}*)`);

    group
      .command("start <short-name>")
      .description(`Create a new ${rule.name} branch`)
      .option("--from <branch>", "override the configured starting point")
      .action(async (shortName: string, options: { from?: string }) => {
        const result = await handlers.start.handle({
          branchType: rule.name,
          shortName,
          ...(options.from !== undefined ? { from: options.from } : {}),
        });
        success(`Created and checked out ${style.cyan(result.branchName)} from ${result.baseBranch}.`);
      });

    group
      .command("finish [short-name]")
      .description(`Finish a ${rule.name} branch: merge, tag, delete`)
      .option("--strategy <strategy>", "merge|squash|rebase")
      .option("--no-delete", "keep the branch after finishing")
      .option("--push", "push the result to the remote", false)
      .option("--dry-run", "show what would happen without doing it", false)
      .action(
        async (
          shortName: string | undefined,
          options: { strategy?: MergeStrategy; delete: boolean; push: boolean; dryRun: boolean },
        ) => {
          const branchName = await resolveBranchArg(git, rule, shortName);
          const result = await handlers.finish.handle({
            branchName,
            ...(options.strategy !== undefined ? { strategy: options.strategy } : {}),
            deleteAfterMerge: options.delete,
            push: options.push,
            dryRun: options.dryRun,
          });
          const verb = result.dryRun ? "Would finish" : "Finished";
          success(`${verb} ${style.cyan(result.branchName)} -> ${result.mergedInto}${result.tag ? ` (tag ${result.tag})` : ""}.`);
          for (const p of result.propagatedTo) {
            info(style.dim(`  also updated ${p.branchName} from ${p.from}`));
          }
        },
      );

    group
      .command("update [short-name]")
      .description(`Sync a ${rule.name} branch with its base`)
      .option("--strategy <strategy>", "merge|rebase")
      .action(async (shortName: string | undefined, options: { strategy?: UpdateStrategy }) => {
        const branchName = await resolveBranchArg(git, rule, shortName);
        const result = await handlers.update.handle({
          branchName,
          ...(options.strategy !== undefined ? { strategy: options.strategy } : {}),
        });
        success(`Updated ${style.cyan(result.branchName)} from ${result.parent} (${result.strategy}).`);
      });

    group
      .command("list")
      .description(`List ${rule.name} branches`)
      .action(async () => {
        const branches = await handlers.list.handle({ branchType: rule.name });
        if (branches.length === 0) {
          info(style.dim(`No ${rule.name} branches.`));
          return;
        }
        for (const b of branches) {
          const marker = b.isCurrent ? style.green("*") : " ";
          info(`${marker} ${b.name}${b.hasUpstream ? "" : style.dim("  (not published)")}`);
        }
      });

    group
      .command("publish [short-name]")
      .description(`Push a ${rule.name} branch and start tracking it`)
      .action(async (shortName: string | undefined) => {
        const branchName = await resolveBranchArg(git, rule, shortName);
        const result = await handlers.publish.handle({ branchName });
        success(`Pushed ${style.cyan(result.branchName)} to ${result.remote}.`);
      });

    group
      .command("track <short-name>")
      .description(`Check out a local copy of a teammate's published ${rule.name} branch`)
      .action(async (shortName: string) => {
        const result = await handlers.track.handle({ branchName: `${rule.prefix}${shortName}` });
        success(`Tracking ${style.cyan(result.branchName)} from ${result.remote}.`);
      });

    group
      .command("checkout <short-name>")
      .description(`Check out a ${rule.name} branch`)
      .action(async (shortName: string) => {
        const branchName = shortName.startsWith(rule.prefix) ? shortName : `${rule.prefix}${shortName}`;
        const result = await handlers.checkout.handle({ query: branchName });
        success(`Switched to ${style.cyan(result.branchName)}.`);
      });

    group
      .command("rename <old-short-name> <new-short-name>")
      .description(`Rename a ${rule.name} branch`)
      .action(async (oldShort: string, newShort: string) => {
        const result = await handlers.rename.handle({
          oldName: `${rule.prefix}${oldShort}`,
          newName: `${rule.prefix}${newShort}`,
        });
        success(`Renamed ${result.oldName} -> ${style.cyan(result.newName)}.`);
      });

    group
      .command("delete <short-name>")
      .description(`Delete a ${rule.name} branch`)
      .option("--force", "delete even if unmerged", false)
      .option("--remote", "also delete the remote-tracking branch", false)
      .action(async (shortName: string, options: { force: boolean; remote: boolean }) => {
        const branchName = shortName.startsWith(rule.prefix) ? shortName : `${rule.prefix}${shortName}`;
        const result = await handlers.delete.handle({
          branchName,
          force: options.force,
          remote: options.remote,
        });
        success(`Deleted ${style.cyan(result.branchName)}${result.deletedRemote ? " (local + remote)" : " (local)"}.`);
      });
  }
}
