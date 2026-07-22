# v2.1: CLI expansion + rich config schema

Builds on the v2 DDD rewrite (see `REWRITE_NOTES.md`). Two things changed:
the CLI grew from 10 commands to 19 practical ones, and `WorkflowConfigLoader`
now understands a much richer, more expressive config schema.

## New CLI commands

| Command | What it does |
|---|---|
| `gitwe pull [--remote <name>]` | Pull the current branch |
| `gitwe push [--remote <name>]` | Push the current branch |
| `gitwe checkout <branch>` | Check out an existing branch |
| `gitwe delete <branch> [--force]` | Delete a local branch (refuses protected branches) |
| `gitwe log [ref] [-n <count>]` | Recent commit history for a branch/ref |
| `gitwe abort` | Abort an in-progress merge (`git merge --abort`), standalone |
| `gitwe clean [--dry-run]` | Delete local branches already fully merged into their configured targets |
| `gitwe init [--template <name>] [--format json\|yaml]` | Scaffold a new config file from a built-in template |
| `gitwe commit-lint [ref]` | Validate a commit message against the workflow's Conventional Commits policy |

## Changed behavior

- **`gitwe finish` now defaults to the current branch** when no branch name
  is given — `gitwe finish` with no args finishes whatever you're on,
  matching how `git flow feature finish` works with no args.
- **`gitwe finish --dry-run`** validates everything (branch exists, rules
  pass, not protected) and reports the plan — merge targets, tag name,
  whether it'll delete — without touching git.
- **Global `-C, --cwd <path>`** — run any command against a different
  directory, useful for scripting across multiple repos/monorepo packages
  without `cd`-ing first.

## Rich config schema

`WorkflowConfigLoader` now parses (JSON or YAML):

```json
{
  "version": 1,
  "workflow": "git-flow",
  "branches": { "main": { "protected": true }, "develop": { "protected": true } },
  "types": {
    "feature": { "prefix": "feature/", "base": "develop", "target": "develop", "deleteAfterFinish": true },
    "release": { "prefix": "release/", "base": "develop", "target": ["main", "develop"], "tag": true },
    "hotfix":  { "prefix": "hotfix/",  "base": "main",    "target": ["main", "develop"] }
  },
  "merge": { "strategy": "merge", "deleteSource": true },
  "tag": { "enabled": true, "prefix": "v" },
  "commit": { "conventional": { "enabled": true } },
  "branchNaming": { "case": "kebab-case", "maxLength": 80 }
}
```

New domain concepts backing this:

- **`branches.*.protected`** → `Workflow.protectedBranches` (a `Set<string>`).
  Checked by `FinishBranchHandler` and the `delete` command; both now throw
  `ProtectedBranchError` rather than silently deleting `main`/`develop` if
  someone's config or a typo'd branch name would have let that happen.
- **`branchNaming.case`/`maxLength`/`pattern`** → `BranchNamingPolicy`, a new
  value object, enforced by a new `BranchNamingRule` wired into
  `RuleEvaluator` for `start` — so a bad branch name is rejected the same
  way an already-existing branch or missing base branch is, not as a
  special case bolted onto the CLI.
- **`merge.strategy`** (`"merge"` \| `"squash"` \| `"rebase"`) → threaded
  through `MergeService` into `GitRepository.merge()`. `ShellGitRepository`
  implements all three: `merge` is the existing `--no-ff` behavior, `squash`
  runs `git merge --squash` + a commit, `rebase` rebases the source onto
  the target then fast-forwards.
- **`tag.enabled`/`tag.prefix`** reconciled with each type's `tag: true` (or
  an object override) into that type's `BranchTypeRule.autoTag` — a global
  `tag.enabled: false` overrides any per-type `tag: true`, so there's one
  place to kill all tagging.
- **`commit.conventional.enabled`** → `ConventionalCommitPolicy`, a new
  domain policy checked by the new `commit-lint` command against the
  Conventional Commits spec. Off by default; nothing changes unless a
  workflow opts in.
- **`merge.deleteSource`** is the workflow-level default for whether a
  finished branch gets deleted; a type's own `deleteAfterFinish` still
  overrides it.

**Backward compatibility:** the loader still accepts the older flat field
names (`baseBranch`, `mergeTargets`, `deleteOnFinish`, a top-level
`branchTypes` array with `name` embedded in each entry) alongside the new
ones (`base`, `target`, `deleteAfterFinish`, a `types` map keyed by name) —
see `tests/infrastructure/WorkflowConfigLoader.test.ts` for both forms
exercised side by side.

## New port methods

`GitRepository` gained two methods needed by `log` and `clean`:

- `getRecentCommits(ref, limit)` — most-recent-first commit history
- `isMerged(branch, into)` — true if `branch`'s history is fully contained
  in `into` (implemented via `git merge-base --is-ancestor`)

Both `ShellGitRepository` and the `InMemoryGitRepository` test double
implement them.

## Tests added

- `tests/domain/BranchNamingPolicy.test.ts`
- `tests/domain/ConventionalCommitPolicy.test.ts`
- `tests/infrastructure/WorkflowConfigLoader.test.ts` (rich schema, legacy
  schema, tag reconciliation, target normalization, error cases)
- Extended `tests/domain/rules.test.ts` (`BranchNamingRule`) and
  `tests/domain/Workflow.test.ts` (protected branches, default policies)
- Extended `tests/application/FinishBranchHandler.test.ts` (dry-run,
  protected-branch rejection)

## What I didn't add (and why)

- **No interactive prompts in `start`/`finish`** when arguments are
  omitted (beyond `finish` defaulting to the current branch). Building a
  real interactive mode well means a prompt library dependency and
  meaningfully more surface area; `gitwe init` scaffolding a config plus
  `--dry-run` covers most of the "I'm not sure what will happen" need
  without it.
- **No shell-completion generation command.** Commander doesn't provide
  this out of the box, and hand-rolling completions for three shells is a
  real chunk of work with its own testing burden — flagging it as a
  reasonable next addition rather than including a half-working version.
- **`merge.strategy` is workflow-level only**, not per-branch-type. The
  schema you gave only specified it globally; adding per-type overrides
  would be speculative until there's an actual need for, say, squashing
  features but merge-committing releases.
