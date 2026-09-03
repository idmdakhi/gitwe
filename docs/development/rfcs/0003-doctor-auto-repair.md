# RFC-0003: Doctor & Auto-Repair

| Field | Value |
| --- | --- |
| **Status** | Implemented |
| **Target** | 1.1 |
| **Priority** | High (DX) |

## Summary

A dedicated `gitwe doctor` command with an optional, safe `--fix` mode that
automatically repairs a well-defined set of problems, rather than leaving
health checks as warnings buried inside `overview`.

## Motivation

New users (and CI jobs) frequently run into:

- missing base branches after a shallow clone or a partial `gitwe init`;
- a stale operation-state file left behind after a crash;
- topic branches that lost their upstream;
- a dirty working tree that blocks every operation.

Before this RFC, these were only reported as warnings inside `overview`, and
users had to know the correct git commands to fix them themselves.

## Design (as implemented)

### Command surface

```
gitwe doctor              # report only (exit 0 = healthy, 1 = problems)
gitwe doctor --fix        # repair everything considered safe
gitwe doctor --fix --yes  # non-interactive (CI)
```

`overview` still reports a summary; `doctor` is the detailed, actionable
view. See [commands.md](../../guides/commands.md#gitwe-doctor).

### Checks & repairs

| ID | Severity | Detection | `--fix` action |
| --- | --- | --- | --- |
| missing base branch | error | base branch declared but absent | create from its parent (or `HEAD` if root) |
| stale operation state | warning | `.git/gitwe/operation.json` exists | delete the file (with confirmation unless `--yes`) — never resumes automatically |
| missing upstream | warning | topic branch has no upstream but the remote branch exists | set upstream to the matching remote-tracking branch |
| dirty working tree | warning | tracked changes present | none — report only, too dangerous to auto-stash |
| detached `HEAD` | warning | `HEAD` is detached | none |
| invalid config | error | workflow definition fails validation | none — the definition must be edited (or use `gitwe config`) |

### Output formats

- Default: human-readable, coloured report.
- `--format json`/`--format yaml`: the same envelope as every other command
  (see [RFC-0004](./0004-machine-readable-output.md)), with a list of
  findings and any actions actually taken under `--fix`.

### Safety rules for `--fix`

1. Never delete a branch or a tag.
2. Never touch the working tree's tracked changes.
3. Every fix is individually confirmable unless `--yes` is passed.
4. A fix that can't be applied safely is reported, not silently skipped.

### Layer impact

| Layer | Changes |
| --- | --- |
| `application` | doctor report type + the checks above |
| `cli/commands/doctor.command.ts` | the `doctor` command, `--fix`/`--yes` flags |
| `infrastructure` | reuses existing `GitRepository` and `FileOperationStateStore` methods — no new adapter needed |
| `tests` | see [testing.md](../testing.md) for current coverage |
