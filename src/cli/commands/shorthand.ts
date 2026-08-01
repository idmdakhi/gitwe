import { Command } from "commander";
import type { WorkflowHandlers } from "#gitwe/cli/container";
import type { GitRepository } from "#gitwe/domain/ports/git-repository";
import type { MergeStrategy, UpdateStrategy } from "#gitwe/domain/valueObjects/merge-strategy";
import { UnrecognizedBranchError } from "#gitwe/domain/errors/index";
import { success, info, style } from "#gitwe/cli/format";

/**
 * Registers top-level shorthands — `gitwe finish`, `update`, `publish`,
 * `delete`, `rename`, `checkout`, `list` — that infer the branch type
 * from the *currently checked-out branch*, so day-to-day use never
 * requires typing the type name (`gitwe feature finish` and plain
 * `gitwe finish`, run while on a feature branch, do the same thing).
 *
 * @internal
 */
export function registerShorthandCommands(
  program: Command,
  handlers: WorkflowHandlers,
  git: GitRepository,
): void {
  async function currentBranchName(): Promise<string> {
    const current = await git.getCurrentBranch();
    if (!handlers.workflow.findRuleForBranch(current)) {
      throw new UnrecognizedBranchError(current);
    }
    return current;
  }

  program
    .command("finish")
    .description("Finish the current branch: merge, tag, delete")
    .option("--strategy <strategy>", "merge|squash|rebase")
    .option("--no-delete", "keep the branch after finishing")
    .option("--push", "push the result to the remote", false)
    .option("--dry-run", "show what would happen without doing it", false)
    .action(
      async (options: { strategy?: MergeStrategy; delete: boolean; push: boolean; dryRun: boolean }) => {
        const branchName = await currentBranchName();
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

  program
    .command("update")
    .description("Sync the current branch with its base")
    .option("--strategy <strategy>", "merge|rebase")
    .action(async (options: { strategy?: UpdateStrategy }) => {
      const branchName = await currentBranchName();
      const result = await handlers.update.handle({
        branchName,
        ...(options.strategy !== undefined ? { strategy: options.strategy } : {}),
      });
      success(`Updated ${style.cyan(result.branchName)} from ${result.parent} (${result.strategy}).`);
    });

  program
    .command("publish")
    .description("Push the current branch and start tracking it")
    .action(async () => {
      const branchName = await currentBranchName();
      const result = await handlers.publish.handle({ branchName });
      success(`Pushed ${style.cyan(result.branchName)} to ${result.remote}.`);
    });

  program
    .command("delete")
    .description("Delete the current branch (switches to its base first)")
    .option("--force", "delete even if unmerged", false)
    .option("--remote", "also delete the remote-tracking branch", false)
    .action(async (options: { force: boolean; remote: boolean }) => {
      const branchName = await currentBranchName();
      const rule = handlers.workflow.findRuleForBranch(branchName);
      await git.checkout(rule ? rule.parent : "main");
      const result = await handlers.delete.handle({
        branchName,
        force: options.force,
        remote: options.remote,
      });
      success(`Deleted ${style.cyan(result.branchName)}${result.deletedRemote ? " (local + remote)" : " (local)"}.`);
    });

  program
    .command("rename <new-name>")
    .description("Rename the current branch")
    .action(async (newName: string) => {
      const branchName = await currentBranchName();
      const rule = handlers.workflow.findRuleForBranch(branchName)!;
      const fullNewName = newName.startsWith(rule.prefix) ? newName : `${rule.prefix}${newName}`;
      const result = await handlers.rename.handle({ oldName: branchName, newName: fullNewName });
      success(`Renamed ${result.oldName} -> ${style.cyan(result.newName)}.`);
    });

  program
    .command("checkout <query>")
    .description("Check out a branch by exact or partial name")
    .action(async (query: string) => {
      const result = await handlers.checkout.handle({ query });
      const note = result.createdTrackingBranch ? style.dim("  (new local tracking branch)") : "";
      success(`Switched to ${style.cyan(result.branchName)}.${note}`);
    });

  program
    .command("list")
    .description("List all topic branches across every type")
    .action(async () => {
      const branches = await handlers.list.handle();
      if (branches.length === 0) {
        info(style.dim("No topic branches."));
        return;
      }
      for (const b of branches) {
        const marker = b.isCurrent ? style.green("*") : " ";
        info(`${marker} ${style.dim(`[${b.type}]`)} ${b.name}${b.hasUpstream ? "" : style.dim("  (not published)")}`);
      }
    });
}
