# Command reference

This page documents every command `src/cli/program.ts` registers on the
`gitwe` binary. If you're looking for the file gitwe reads to know what a
"feature" or "develop" even means, see the
[workflow definition reference](./workflow-definition.md).

## Global options

Available on every command, defined once on the root program:

| Flag | Description |
| --- | --- |
| `--cwd <path>` | run as if gitwe was started in `<path>` (default: current directory) |
| `-C, --config <path>` | explicit path to the workflow definition file |
| `--no-color` | disable coloured output |
| `-v, --verbose` | verbose logging |
| `--dry-run` | simulate without making changes (support varies by command) |
| `--format <format>` | output format: `text` (default), `json`, `yaml`, or `table` |
| `-h, --help` | show help for the command |
| `--version` | print the gitwe version (root command only) |

`--format json`/`--format yaml` wrap every command's result in a stable
envelope: `{ schemaVersion: 1, command, ok, data, warnings, error }`. Errors
populate `error` (with `code`, `message`, optional `hint`, and `files` for
conflicts) instead of the process throwing text to stderr. `--format table`
is accepted by every command but currently renders identically to `text` — a
real tabular renderer is tracked in the [roadmap](../development/roadmap.md).

Exit codes: `0` success, `1` error, `2` the operation stopped on a merge
conflict (`GitweError` with `code: "CONFLICT"`).

---

## `gitwe init`

Create a workflow definition (`.gitwe/gitwe.yaml` by default) in the current
repository.

| Option | Description |
| --- | --- |
| `-p, --preset <preset>` | `classic` \| `github` \| `gitlab` (default `classic`) |
| `-d, --defaults` | accept the preset defaults without prompting (skip the interactive wizard) |
| `-f, --force` | overwrite an existing workflow definition |
| `--file <path>` | definition file to write (default `.gitwe/gitwe.yaml`) |
| `--no-create-branches` | do not create missing base branches |
| `-b, --branch <name=value>` | rename a base branch, repeatable (e.g. `--branch main=trunk`) |
| `--prefix <name=value>` | override a branch type's prefix, repeatable (e.g. `--prefix feature=feat/`) |
| `-r, --remote <name>` | default remote name |
| `--versioning-enabled` | enable versioning (tags on release/hotfix) |
| `--tag-prefix <prefix>` | version tag prefix (default `v`) |

```bash
gitwe init                                  # interactive wizard (TTY only)
gitwe init --preset classic --defaults      # non-interactive
gitwe init -p classic --branch main=trunk --prefix feature=feat/
gitwe init --remote upstream --no-create-branches --force
```

In an interactive terminal, omitting `--defaults` (and using `--format text`,
the default) launches a short wizard: preset → workflow name → base-branch
renames → prefix overrides → merge strategy → remote → versioning → hooks →
"create missing branches?" → summary and confirm. `--defaults`, a non-TTY
session, or `--format json|yaml` always skip the wizard and write the preset
(with any `--branch`/`--prefix`/`--remote` overrides applied) as-is.
Cancelling at the final confirmation exits with code `1` and writes nothing.

## `gitwe start <type> <name> [base]`

Create a new topic branch. `<type>` must be a configured branch type (e.g.
`feature`, `release`, `hotfix`) or one of its aliases; `<name>` is the short
name (e.g. `login` becomes `feature/login`). `[base]` overrides the type's
configured base branch for this one branch.

| Option | Description |
| --- | --- |
| `--fetch` | fetch the base branch first |

```bash
gitwe start feature login
gitwe start release 1.0.0 develop
```

## `gitwe finish [name]`

Merge a topic branch into its configured target(s). Defaults to the current
branch if `[name]` is omitted.

| Option | Description |
| --- | --- |
| `--squash` | squash-merge instead of a merge commit |
| `--rebase` | rebase the topic branch onto its parent before merging |
| `--no-ff` | always create a merge commit |
| `-M, --merge-message <message>` | message for the merge commit |
| `--squash-message <message>` | commit message for a squash merge |
| `--tag` / `--no-tag` | force or suppress tag creation, overriding `versioning` config |
| `--tagname <name>` | use a specific tag name |
| `-m, --message <message>` | tag message |
| `--sign` | sign the tag with GPG |
| `--signingkey <keyid>` | GPG key to sign the tag with |
| `--keep` / `--no-keep` | keep or delete the local topic branch after finishing |
| `--keep-remote` / `--no-keep-remote` | keep or delete the remote topic branch after finishing |
| `--force-delete` | delete the topic branch even if it is not fully merged |
| `-f, --force` | skip the remote-sync check (force finish even if the branch is behind its remote) |
| `--no-fetch` | do not fetch the remote before finishing |
| `--current-version <semver>` | current version, as the base for a version bump |
| `--major` / `--minor` / `--patch` | force a specific version-bump level |
| `-c, --continue` | resume a finish that stopped on a conflict |
| `-a, --abort` | cancel an in-progress finish and roll it back |
| `--push` | push targets (and any tag) after merging |

```bash
gitwe finish                       # finish the current branch
gitwe finish feature/login --push
gitwe finish release/1.0.0 --tag --push
gitwe finish --continue            # after resolving a conflict
gitwe finish --abort               # give up on the in-progress finish
```

If a merge conflict stops `finish` partway through, gitwe persists progress
to `.git/gitwe/operation.json` and exits with code `2`. Resolve the conflict, then run
`gitwe finish --continue` (can be a separate process) or `gitwe finish --abort`
to roll back everything touched so far. See
["The resumable finish operation"](../architecture/overview.md#the-resumable-finish-operation).

## `gitwe update [name]`

Bring a topic branch up to date with its base branch. Defaults to the current
branch.

| Option | Description |
| --- | --- |
| `--rebase` | rebase instead of merge |
| `--fetch` | fetch the base branch first |

```bash
gitwe update feature/login --rebase
```

A merge/rebase conflict here also raises `ConflictError` (exit code `2`) with
the list of conflicted files, but `update` itself is not resumable the way
`finish` is — resolve the conflict with plain git and re-run, or abort with
`git merge --abort` / `git rebase --abort`.

## `gitwe sync`

Fetch configured remotes and update the **current** topic branch from its
workflow parent in one step (equivalent to `gitwe update --fetch` with the
branch inferred).

| Option | Description |
| --- | --- |
| `--rebase` | rebase onto the parent instead of merging |

```bash
gitwe sync
gitwe sync --rebase
```

## `gitwe pull`

Fetch configured remotes and integrate the **current** branch from its git
upstream (`origin/<branch>`, wherever `git branch -u` points) — not the
workflow's `base`. Use `gitwe update`/`gitwe sync` to update from the
workflow base instead.

| Option | Description |
| --- | --- |
| `--rebase` | rebase onto upstream instead of merging |

```bash
gitwe pull
gitwe pull --rebase
```

If the current branch has no upstream set, gitwe reports what it fetched and
suggests `gitwe publish` (or `git branch -u <remote>/<branch>`) instead of
failing.

## `gitwe publish [name]` (alias `push`)

Push a topic branch to every configured remote and set its upstream. Defaults
to the current branch.

| Option | Description |
| --- | --- |
| `--force` | force-push with `--force-with-lease` |

```bash
gitwe publish feature/login
gitwe push feature/login          # same command
```

## `gitwe delete [name]`

Delete a topic branch. Defaults to the current branch; if the branch being
deleted is currently checked out, gitwe first checks out its base.

| Option | Description |
| --- | --- |
| `-f, --force` | delete even if not fully merged |
| `-r, --remote` | also delete matching remote branches |

```bash
gitwe delete feature/login --force --remote
```

## `gitwe rename <new-name>`

Rename the **current** topic branch's short name, keeping its type prefix
(e.g. `feature/login` → `feature/auth` via `gitwe rename auth`).

```bash
gitwe rename auth
```

## `gitwe track <branch-or-type> [name]`

Create a local topic branch tracking the matching remote-tracking branch,
without creating a new remote branch. Accepts either a full branch name, or a
type plus a short name.

```bash
gitwe track feature/login          # full branch name
gitwe track feature login          # type + short name, same result
```

## `gitwe checkout <type-or-branch> [name]`

Switch to a branch by full name, or by topic type plus a short name or unique
prefix of one.

```bash
gitwe checkout feature/login
gitwe checkout feature login
```

## `gitwe list [type] [pattern]`

List topic branches, optionally restricted to `[type]` and filtered by a glob
`[pattern]` on the short name.

```bash
gitwe list
gitwe list feature
gitwe list feature "login-*"
```

## `gitwe types`

List the topic types defined in the active workflow, with their prefix, base,
target(s) and aliases.

```bash
gitwe types
```

## `gitwe current`

Show the resolved type, short name, base, and target(s) of whatever branch is
currently checked out (or report a detached `HEAD` / an unrecognised branch).

```bash
gitwe current
```

## `gitwe overview` (alias `status`)

Print the workflow name, current branch, configured base branches, and a
per-type count of topic branches.

```bash
gitwe overview
gitwe status                       # same command
```

## `gitwe validate`

Validate the workflow definition discovered for the current repository
(honours `--config`). Prints `workflow definition is valid` or lists every
issue found and exits with code `1`.

```bash
gitwe validate
gitwe validate --config .gitwe/gitwe.yaml
```

## `gitwe doctor`

Check repository health against the workflow definition: config validity,
detached `HEAD`, missing base branches, a stale `.git/gitwe/operation.json`, topic
branches without an upstream, and a dirty working tree.

| Option | Description |
| --- | --- |
| `--fix` | attempt to safely repair fixable problems (missing base branches, stale operation state) |
| `--yes` | non-interactive; assume yes for `--fix` confirmations |

```bash
gitwe doctor
gitwe doctor --fix --yes
```

Exits `0` if every finding is `ok`/`warning`, `1` if any finding is an
`error`.

## `gitwe clean`

Report (or remove) a stale gitwe operation state file left behind by an
interrupted `finish`. Never touches branches or worktree files — use
`gitwe finish --abort` for that.

| Option | Description |
| --- | --- |
| `-f, --force` | actually delete the state file (default: report only) |

```bash
gitwe clean
gitwe clean --force
```

## `gitwe tag [name]`

List, create, delete, or push tags.

| Option | Description |
| --- | --- |
| `-m, --message <message>` | annotated tag message (used when creating) |
| `-d, --delete` | delete the local tag |
| `--delete-remote` | delete the remote tag (combine with `--delete`, or use alone) |
| `-p, --push` | push the newly created tag to the default remote |
| `--push-all` | push all tags to the default remote |

```bash
gitwe tag                          # list tags
gitwe tag v1.2.0 -m "release" -p   # create and push
gitwe tag v1.2.0 --delete --delete-remote
```

`--push` and `--push-all` are mutually exclusive with each other and with
`--delete`/`--delete-remote`.

## `gitwe rebase [name]`

Shorthand for `gitwe update --rebase`: rebase a topic branch (default:
current) onto its base.

| Option | Description |
| --- | --- |
| `--fetch` | fetch the base branch first |

```bash
gitwe rebase feature/login --fetch
```

## `gitwe abort`

Cancel an in-progress `finish` operation and restore everything it had
touched. Equivalent to `gitwe finish --abort`.

```bash
gitwe abort
```

## `gitwe log [args...]`

`git log` with a workflow-friendly default view. Any extra arguments are
passed straight through to `git log`.

```bash
gitwe log                                   # --oneline --decorate --graph --branches --remotes
gitwe log --author=me -- src/
```

## `gitwe graph`

Print a branch graph covering the workflow's base branches and topics.

| Option | Description |
| --- | --- |
| `--root <branch>` | show commits reachable from this branch only (omit to show all branches) |

```bash
gitwe graph
gitwe graph --root main
```

## `gitwe config <subcommand>`

Inspect and edit the workflow definition without hand-editing YAML. Every
change is validated the same way as the file itself before it's written.

### `gitwe config list`

Print the full resolved workflow definition.

```bash
gitwe config list
```

### `gitwe config add <kind> <name> [base]`

Add a base branch or a branch type. `<kind>` is `base` or `branchType`.

| Option | Description |
| --- | --- |
| `--prefix <prefix>` | branch prefix (branch types only, required) |
| `--target <target>` | target branch(es), comma-separated (branch types only, required) |
| `--aliases <aliases>` | comma-separated aliases |
| `--protected` | mark the base branch as protected |

```bash
gitwe config add base staging main
gitwe config add branchType spike develop --prefix spike/ --target develop
```

### `gitwe config edit <kind> <name>`

Edit an existing base branch or branch type.

| Option | Description |
| --- | --- |
| `--base <branch>` | new base branch |
| `--prefix <prefix>` | new prefix (branch types only) |
| `--target <target>` | new target branch(es), comma-separated |
| `--aliases <aliases>` | new aliases, comma-separated |
| `--protected` / `--no-protected` | set or clear protected (base branches only) |

```bash
gitwe config edit branchType feature --target develop,main
```

### `gitwe config rename <kind> <from> <to>`

Rename a base branch or branch type, rewiring every `base`/`target`
reference that pointed at the old name.

```bash
gitwe config rename base main trunk
```

### `gitwe config delete <kind> <name>`

Remove a base branch or branch type from the definition.

```bash
gitwe config delete branchType support
```

## `gitwe version`

Print the installed gitwe version.

```bash
gitwe version
```

---

## Library usage

Everything above is a thin CLI wrapper around `Engine`. You can call the same
operations from Node/TypeScript directly — see the
["Library usage"](../../README.md#library-usage) section of the main README.
