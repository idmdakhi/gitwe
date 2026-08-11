# Command reference

Global options work anywhere on the command line:

- `-C, --config <path>` — use a specific workflow definition
- `--cwd <path>` — run as if gitwe was started in `<path>`
- `-v, --verbose` — print every git command gitwe runs
- `--no-color` — disable coloured output
- `--dry-run` — simulate the operation without making changes
- `--format <text|json|yaml|table>` — output format (default `text`)
- `--version`, `-h, --help`

Exit codes: `0` success, `1` error, `2` the operation stopped on a merge conflict.

---

## Core commands

### `gitwe init`

Write a workflow definition and create any missing base branches.

| Option                                                                        | Description                                     |
| ----------------------------------------------------------------------------- | ----------------------------------------------- |
| `-f, --force`                                                                 | overwrite an existing definition                |
| `-p, --preset <classic\|github\|gitlab>`                                      | preset to start from (default `classic`)        |
| `-d, --defaults`                                                              | do not prompt, accept the preset defaults       |
| `--file <path>`                                                               | write to a specific file (default `gitwe.json`) |
| `--no-create-branches`                                                        | do not create missing base branches             |
| `-m, --main <name>`, `--develop`, `--staging`, `--production`                 | base branch name overrides                      |
| `--feature`, `-b, --bugfix`, `-r, --release`, `-x, --hotfix`, `-s, --support` | prefix overrides                                |
| `-t, --tag <prefix>`                                                          | version tag prefix                              |
| `--remote <name>`                                                             | remote name                                     |

Without `--defaults` on a TTY, gitwe asks for each branch name and prefix.

---

### `gitwe config <command>`

Inspect and edit the workflow definition.

| Command                          | Description                                      |
| -------------------------------- | ------------------------------------------------ |
| `list`                           | print the definition as a branch tree            |
| `add base <name> [parent]`       | add a base branch                                |
| `add topic <name> <parent>`      | add a topic type                                 |
| `edit base\|topic <name>`        | change fields of an existing entry               |
| `rename base\|topic <from> <to>` | rename an entry (base renames update references) |
| `delete base\|topic <name>`      | remove an entry (refuses if still referenced)    |

Options: `--parent`, `--prefix`, `--starting-point`, `--upstream-strategy`,
`--downstream-strategy`, `--auto-update` / `--no-auto-update`, `--tag` / `--no-tag`,
`--tag-prefix`, `--keep` / `--no-keep`.

`gitwe config` only edits the definition file; existing git branches are untouched.

---

### `gitwe overview` (alias `gitwe status`)

Configuration summary, base branch tree with ahead/behind counts, topic branches per
type, and health checks (missing base branches, branches behind their upstream, a dirty
working tree, an operation waiting for `--continue`).

`--format text|json|yaml|table` — `json` and `yaml` are meant for CI and tooling.

---

### `gitwe validate [file]`

Validate a workflow definition file. If no file is given, the one found in the repository is used.

---

### `gitwe doctor [--fix] [--yes]`

Check repository health (missing base branches, stale operation state, etc.).
`--fix` attempts to repair problems (currently a placeholder – see RFC-0003).

---

### `gitwe graph`

Show the branch graph (base branches and topic branches).

---

### `gitwe version`

Print the gitwe version.

---

## Topic branch commands (global shorthands)

These commands operate on topic branches. The `<type>` argument must match a configured topic type (e.g. `feature`, `release`, `hotfix`).

### `gitwe start <type> <name> [base] [--fetch]`

Creates a new topic branch of the given type with short name `<name>`.  
Optionally specify a different start point with `[base]` (branch, tag or commit).  
`--fetch` fetches from the remote before creating the branch.

### `gitwe finish [name] [options]`

Finishes the current topic branch (or the one named by `[name]`).

Steps: preflight → fetch → remote sync check → optional rebase → merge into the parent
→ tag → update auto-updating children → push → delete remote branch → delete local
branch → check out the branch you end on.

| Option                                                                                        | Description                               |
| --------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `-c, --continue`                                                                              | resume after resolving conflicts          |
| `-a, --abort`                                                                                 | roll every touched branch and tag back    |
| `-f, --force`                                                                                 | skip the remote sync check                |
| `--no-fetch`                                                                                  | do not fetch first                        |
| `--keep`, `--keep-remote`, `--force-delete`                                                   | branch retention                          |
| `--tag`, `--no-tag`, `--tagname <name>`, `-m, --message <msg>`, `--sign`, `--signingkey <id>` | tagging                                   |
| `--squash`, `--rebase`, `--no-ff`                                                             | merge strategy overrides                  |
| `-M, --merge-message <msg>`, `--squash-message <msg>`, `--update-message <msg>`               | commit messages                           |
| `--no-verify`                                                                                 | bypass git hooks during merges            |
| `--push`                                                                                      | push the updated base branches (and tags) |

Message placeholders: `%b` branch, `%B` full refname, `%p` parent, `%P` full parent
refname, `%%` literal percent.

### `gitwe update [name] [--rebase] [--fetch]`

Brings the current (or named) topic branch up to date with its parent using the configured downstream strategy.  
`--rebase` forces a rebase; `--fetch` fetches first.

### `gitwe rebase [name]`

Alias for `update --rebase`.

### `gitwe publish [name] [-o <push-option>...]`

Pushes the current (or named) topic branch and sets its upstream.  
`-o` transmits server-side push options (GitLab, Gitea, Gerrit).

### `gitwe delete [name] [-f] [-r]`

Deletes the current (or named) topic branch.  
`-f, --force` deletes even if not fully merged; `-r, --remote` also deletes the remote branch.

### `gitwe rename <new-name>`

Renames the current topic branch to `<new-name>`.

### `gitwe checkout <type> <name|prefix>`

Switches to a topic branch of the given type. If `<name>` is a prefix that uniquely matches one branch, that branch is checked out. If ambiguous, the command reports the candidates.

### `gitwe track <type> <name>`

Creates a local topic branch tracking the remote one. Fetches first and checks out the branch.

### `gitwe list <type> [pattern]`

Lists topic branches of the given type. The optional `pattern` is a shell‑style glob (`*`, `?`, `[abc]`) applied to the short name.

### `gitwe current`

Shows information about the current topic branch (name, type, parent, upstream).

---

## Examples

```bash
# Initialise a classic git‑flow workflow
gitwe init --preset classic

# Start a feature branch
gitwe start feature login

# Make some commits, then finish it
gitwe finish

# Start a release branch from develop
gitwe start release 1.0.0 --base develop

# Finish the release (tags and back‑merges automatically)
gitwe finish release/1.0.0

# List all feature branches
gitwe list feature

# Update the current branch from its parent
gitwe update

# Publish the current branch
gitwe publish

# Delete the current branch
gitwe delete --force
```
