# Command reference

Global options work anywhere on the command line:

- `-C, --config <path>` — use a specific workflow definition
- `--cwd <path>` — run as if gitwe was started in `<path>`
- `-v, --verbose` — print every git command gitwe runs
- `--no-color` — disable coloured output
- `--version`, `-h, --help`

Exit codes: `0` success, `1` error, `2` the operation stopped on a merge conflict.

## Core commands

### `gitwe init`

Write a workflow definition and create any missing base branches.

| Option | Description |
| --- | --- |
| `-f, --force` | overwrite an existing definition |
| `-p, --preset <classic\|github\|gitlab>` | preset to start from (default `classic`) |
| `-d, --defaults` | do not prompt, accept the preset defaults |
| `--file <path>` | write to a specific file (default `gitwe.json`) |
| `--no-create-branches` | do not create missing base branches |
| `-m, --main <name>`, `--develop`, `--staging`, `--production` | base branch name overrides |
| `--feature`, `-b, --bugfix`, `-r, --release`, `-x, --hotfix`, `-s, --support` | prefix overrides |
| `-t, --tag <prefix>` | version tag prefix |
| `--remote <name>` | remote name |

Without `--defaults` on a TTY, gitwe asks for each branch name and prefix.

### `gitwe config <command>`

| Command | Description |
| --- | --- |
| `list` | print the definition as a branch tree |
| `add base <name> [parent]` | add a base branch |
| `add topic <name> <parent>` | add a topic type |
| `edit base\|topic <name>` | change fields of an existing entry |
| `rename base\|topic <from> <to>` | rename an entry (base renames update references) |
| `delete base\|topic <name>` | remove an entry (refuses if still referenced) |

Options: `--parent`, `--prefix`, `--starting-point`, `--upstream-strategy`,
`--downstream-strategy`, `--auto-update` / `--no-auto-update`, `--tag` / `--no-tag`,
`--tag-prefix`, `--keep` / `--no-keep`.

`gitwe config` only edits the definition file; existing git branches are untouched.

### `gitwe overview` (alias `gitwe status`)

Configuration summary, base branch tree with ahead/behind counts, topic branches per
type, and health checks (missing base branches, branches behind their upstream, a dirty
working tree, an operation waiting for `--continue`).

`--format text|json|yaml` — `json` and `yaml` are meant for CI and tooling.

### `gitwe version`

Print the gitwe version.

## Topic branch commands

For every topic type in the definition gitwe generates `gitwe <type> <command>`.
The examples use `feature`.

### `start`

```
gitwe feature start <name> [base] [--fetch]
```

Creates `<prefix><name>` from the type's start point (or `base`) and checks it out.
Fails on a dirty working tree, an existing branch, or an invalid branch name.

### `finish`

```
gitwe feature finish [name] [options]
```

Steps: preflight → fetch → remote sync check → optional rebase → merge into the parent
→ tag → update auto-updating children → push → delete remote branch → delete local
branch → check out the branch you end on.

| Option | Description |
| --- | --- |
| `-c, --continue` | resume after resolving conflicts |
| `-a, --abort` | roll every touched branch and tag back |
| `-f, --force` | skip the remote sync check |
| `--no-fetch` | do not fetch first |
| `--keep`, `--keepremote`, `--force-delete` | branch retention |
| `--tag`, `--no-tag`, `--tagname <name>`, `-m, --message <msg>`, `--sign`, `--signingkey <id>` | tagging |
| `--squash`, `--rebase`, `--no-ff` | merge strategy overrides |
| `-M, --merge-message <msg>`, `--squash-message <msg>`, `--update-message <msg>` | commit messages |
| `--no-verify` | bypass git hooks during merges |
| `--push` | push the updated base branches (and tags) |

Message placeholders: `%b` branch, `%B` full refname, `%p` parent, `%P` full parent
refname, `%%` literal percent.

The remote sync check refuses to finish a branch that is behind its remote tracking
branch, so nobody else's commits are dropped; `--force` bypasses it.

### `publish`, `track`

```
gitwe feature publish [name] [-o <push-option>]...
gitwe feature track <name>
```

`publish` pushes the branch and sets its upstream; `-o` transmits server-side push
options (GitLab, Gitea, Gerrit). `track` fetches and checks out a branch someone else
published.

### `update`

```
gitwe feature update [name] [--rebase] [--fetch]
```

Brings the topic branch up to date with its parent using the configured downstream
strategy; `--rebase` forces a rebase.

### `list`, `checkout`, `rename`, `delete`

```
gitwe feature list [pattern]        # globs: * ? [abc]
gitwe feature checkout <name|prefix>
gitwe feature rename <old> [new]
gitwe feature delete [name] [-f] [-r]
```

`checkout` accepts a unique prefix and reports the candidates when a name is ambiguous.
`delete -r` also deletes the remote branch.

## Shorthands

These act on the current branch when no name is given:

```
gitwe start <type> <name> [base]
gitwe finish [name]
gitwe update [name]
gitwe rebase [name]        # update --rebase
gitwe publish [name]
gitwe delete [name]
gitwe rename <new-name>
```
