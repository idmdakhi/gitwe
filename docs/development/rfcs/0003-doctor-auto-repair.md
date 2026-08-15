# RFC-0003: Doctor & Auto-Repair

| Field         | Value             |
| ------------- | ----------------- |
| **Status**    | Draft             |
| **Date**      | 2026-08-01        |
| **Target**    | 1.1               |
| **Priority**  | High (DX)         |
| **Author(s)** | gitwe maintainers |
| **Related**   | —                 |

## Summary

Strengthen the existing health checks (currently part of `overview`) into a dedicated `gitwe doctor` command and add a safe `--fix` mode that can automatically repair a well-defined set of problems.

## Motivation

New users (and CI jobs) frequently encounter:

- Missing base branches after a shallow clone or a partial `gitwe init`
- A stale `.gitwe/operation.json` left behind after a crash
- Topic branches that lost their upstream
- Working-tree dirtiness that blocks every operation

Today these problems are only reported as warnings inside `overview`.  
Users must know the correct git commands to fix them.  
A first-class `doctor` command with an optional safe repair mode dramatically improves the out-of-the-box experience.

## Detailed Design

### Command surface

```
gitwe doctor              # report only (exit 0 = healthy, 1 = problems)
gitwe doctor --fix       # repair everything that is considered safe
gitwe doctor --fix --yes # non-interactive (CI)
```

`overview` continues to embed a short health summary; `doctor` is the detailed view.

### Checks & repairs

| ID                 | Severity | Detection                                      | `--fix` action                                     | Notes                          |
| ------------------ | -------- | ---------------------------------------------- | -------------------------------------------------- | ------------------------------ |
| `missing-base`     | error    | base branch declared but absent                | create from parent (or HEAD if root)               | same logic as `init`           |
| `stale-operation`  | warning  | `.gitwe/operation.json` exists                 | delete the file (with confirmation unless `--yes`) | never resumes automatically    |
| `missing-upstream` | warning  | topic branch has no upstream but remote exists | `git branch --set-upstream-to=…`                   | only if remote branch present  |
| `dirty-worktree`   | warning  | tracked changes present                        | none (report only)                                 | too dangerous to auto-stash    |
| `unknown-parent`   | error    | config references a non-existent base          | none (report only – config must be edited)         |                                |
| `shared-prefix`    | error    | two topic types share a prefix                 | none                                               | already rejected at parse time |
| `detached-head`    | warning  | HEAD is detached                               | none                                               |                                |

Additional checks can be added later without breaking the CLI.

### Output formats

- Default: human-readable coloured report (same style as `overview`)
- `--format json|yaml`: machine-readable list of findings + actions taken

### Layer impact

| Layer            | Changes                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `application`    | New `DoctorReport` type + `Engine.doctor()` method                    |
| `cli`            | New `doctor` command (or promote the existing health logic)           |
| `infrastructure` | Re-use existing `GitRepository` and `FileOperationStateStore` methods |
| tests            | New `tests/engine/doctor.test.ts`                                     |
| docs             | `commands.md`                                                         |

### Safety rules for `--fix`

1. Never delete a branch or tag.
2. Nev
   ...
