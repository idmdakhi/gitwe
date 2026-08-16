# Command reference

> **This page documents the commands `src/cli/program.ts` actually registers
> today.** gitwe's CLI was rewritten on a Clean Architecture (see
> [ARCHITECTURE.md](./ARCHITECTURE.md)), and only the nine commands below are
> currently wired into the `gitwe` binary. Files like `doctor.ts`, `graph.ts`,
> `config.ts`, `checkout.ts`, `track.ts`, `rename.ts`, `current.ts` and
> `rebase.ts` still exist under `src/cli/commands/` from an earlier iteration,
> but `program.ts` does not import them, so those commands do not run. The
> same applies to `--format`/`--dry-run`: the JSON/YAML envelope machinery in
> `cli/output.ts` and `cli/options.ts` exists, but no command below calls into
> it yet. All of this is tracked, prioritised work — see
> [ROADMAP.md](./development/ROADMAP.md) and
> [TODO.md](./development/TODO.md) — not a documentation choice.

## Global options

Available on every command, defined once on the root program:

| Flag                | Description                                          |
| -------------------- | ----------------------------------------------------- |
| `--cwd <path>`        | run as if gitwe was started in `<path>` (default: current directory) |
| `--config <path>`      | explicit path to the workflow definition file          |
| `--no-color`            | disable coloured output                                |
| `-v, --verbose`          | verbose logging                                          |
| `-h, --help`              | show help for the command                                |
| `--version`                 | print the gitwe version (root command only)               |

Exit codes: `0` success, `1` error, `2` the operation stopped on a merge
conflict (thrown as `ConflictError`, `code: "CONFLICT"`).

---

## `gitwe init`

Create a workflow definition (`.gitwe/gitwe.yaml`) in this repository.

| Option              | Description                                |
| -------------------- | -------------------------------------------- |
| `--preset <name>`     | `classic` \| `github` \| `gitlab` (default `classic`) |
| `--force`               | overwrite an existing definition               |

```bash
gitwe init --preset classic
```

## `gitwe start <type> <name> [base]`

Create a new topic branch. `<type>` must be a configured branch type (e.g.
`feature`, `release`, `hotfix`); `<name>` is the short name (e.g. `login`
becomes `feature/login`). `[base]` overrides the branch's configured base.

| Option    | Description                       |
| ---------- | ------------------------------------ |
| `--fetch`   | fetch the base branch before creating |

```bash
gitwe start feature login
gitwe start release 1.0.0 develop
```

## `gitwe finish [name]`

Merge a topic branch into its configured target(s). Defaults to the current
branch if `[name]` is omitted.

| Option                        | Description                                     |
| ------------------------------ | -------------------------------------------------- |
| `--squash`                       | squash-merge instead of a merge commit               |
| `--push`                           | push targets after merging (default: off)              |
| `--current-version <semver>`         | current version to base the tag bump on                  |
| `--continue`                           | resume a `finish` that stopped on a conflict               |
| `--abort`                                | cancel an in-progress `finish` and roll it back                |

```bash
gitwe finish                       # finish the current branch
gitwe finish feature/login --push
gitwe finish --continue            # after resolving a conflict
gitwe finish --abort               # give up on the in-progress finish
```

If a merge conflict stops `finish` partway through, gitwe persists progress to
`.gitwe/state.json` and exits with code `2`. Resolve the conflict, then run
`gitwe finish --continue` (can be a separate process) or `gitwe finish --abort`
to roll back everything touched so far. See
["The resumable finish operation"](./ARCHITECTURE.md#the-resumable-finish-operation).

## `gitwe update <name>`

Bring a topic branch up to date with its base branch.

| Option    | Description                        |
| ---------- | -------------------------------------|
| `--rebase`  | rebase instead of merge                |
| `--fetch`     | fetch the base branch first              |

```bash
gitwe update feature/login --rebase
```

## `gitwe publish <name>` (alias: `push`)

Push a topic branch and set its upstream.

| Option    | Description               |
| ---------- | ---------------------------- |
| `--force`   | force-push with `--force-with-lease` |

```bash
gitwe publish feature/login
```

## `gitwe delete <name>`

Delete a topic branch.

| Option              | Description                          |
| -------------------- | --------------------------------------- |
| `-f, --force`          | delete even if not fully merged           |
| `-r, --remote`           | also delete the remote branch               |

```bash
gitwe delete feature/login --force --remote
```

## `gitwe list [type] [pattern]`

List topic branches, optionally restricted to `[type]` and filtered by a glob
`[pattern]` on the short name.

```bash
gitwe list feature
gitwe list feature "login-*"
```

## `gitwe overview` (alias: `status`)

Print the workflow name, current branch, configured base branches, and a
per-type count of topic branches. No options beyond the globals above.

```bash
gitwe overview
gitwe status   # same command
```

## `gitwe validate`

Validate the workflow definition discovered for the current repository
(honours `--config`). Prints `workflow definition is valid` or lists every
issue found and exits with code `1`.

```bash
gitwe validate
gitwe validate --config .gitwe/gitwe.yaml
```

---

## Not yet available

The following are documented in [`ROADMAP.md`](./development/ROADMAP.md) and
[`TODO.md`](./development/TODO.md) as planned, and referenced by the
(currently out-of-sync) root [`action.yaml`](../action.yaml) and
[`.github/workflows/e2e.yaml`](../.github/workflows/e2e.yaml), but are **not**
runnable through the `gitwe` binary today:

- `gitwe doctor [--fix]` — repository health checks (RFC-0003)
- `gitwe graph` — branch graph view
- `gitwe config <add|edit|rename|delete>` — edit the workflow definition from the CLI
- `gitwe checkout <type> <name|prefix>`, `gitwe track <type> <name>`, `gitwe rename <new-name>`, `gitwe current`, `gitwe rebase` (alias for `update --rebase`)
- `--format json|yaml|table` on any command (RFC-0004)
- Message placeholders (`%b`, `%B`, `%p`, `%P`, `%%`) and the extra `finish`
  flags described in earlier drafts of this page (`--keep`, `--keep-remote`,
  `--force-delete`, `--tag`/`--no-tag`, `--sign`, `-M/--merge-message`, etc.)

If you need one of these today, the underlying use case may already exist in
`src/application/use-cases/` and just needs a `cli/commands/*.command.ts`
wired into `program.ts` — see [ARCHITECTURE.md](./ARCHITECTURE.md) and
[contributing.md](./development/contributing.md).

## Library usage

Everything above is a thin CLI wrapper around `Engine`. You can call the same
operations from Node/TypeScript directly — see the
["Library usage"](../README.md#library-usage) section of the main README.
