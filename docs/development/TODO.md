# gitwe TODO

Last updated: 2026-08-13  
Current version: **1.0.0**

This file is the single source of truth for planned work.  
Items are grouped by priority and target release.  
Checkboxes can be ticked in PRs; please keep the file up to date.

---

## Legend

| Priority | Meaning                                     |
| -------- | ------------------------------------------- |
| **P0**   | Blockers / must-fix before next patch/minor |
| **P1**   | High-value for the next minor (1.1)         |
| **P2**   | Important features for 1.2                  |
| **P3**   | Nice-to-have / later (1.3+)                 |

| Status | Meaning              |
| ------ | -------------------- |
| `[ ]`  | Not started          |
| `[~]`  | In progress          |
| `[x]`  | Done                 |
| `[-]`  | Cancelled / deferred |

---

## P0 – Immediate (1.0.x / early 1.1)

### CI & Release hygiene

- [ ] Re-enable the currently disabled jobs (`if: false`) in:
  - `.github/workflows/ci.yaml`
  - `.github/workflows/e2e.yaml`
  - `.github/workflows/nightly.yaml`
  - `.github/workflows/release.yaml`
  - relevant parts of `.github/workflows/publish.yaml`
- [ ] Align Node.js versions across `action.yaml`, `package.json` engines and all workflows (prefer 20 + 22 + 24 matrix where sensible).
- [ ] Make the composite Action and root `action.yaml` cache `node_modules` and `dist` correctly.
- [ ] Verify `publish.yaml` matrix (npm + GitHub Packages) still works after the 1.0 rewrite.

### Output & CLI consistency

- [ ] Add `schemaVersion: 1` to every JSON response (see RFC-0004).
- [ ] Make `--format json|yaml|table` available on `start`, `finish`, `list`, `version`, `config list`, `doctor` and `overview`.
- [ ] Treat the old `--json` flag as a deprecated alias for `--format json`.

### Error experience

- [ ] Review and improve all `hint` strings in `domain/errors.ts` and the CLI reporter.
- [ ] Ensure ConflictError always lists the exact files and the exact resume command.
- [ ] Add a short “common problems” section to `docs/commands.md`.

### Code quality

- [ ] Remove or translate remaining Persian comments in the domain layer so the codebase is consistently English.
- [ ] Raise test coverage on `ShellGitRepository` (especially conflict, rebase-in-progress, missing-remote and Windows paths).
- [ ] Support `GITWE_CONFIG` environment variable as an alternative to `--config`.

---

## P1 – 1.1 (DX & robustness)

### Doctor (RFC-0003)

- [ ] Implement `gitwe doctor` (report-only).
- [ ] Implement `gitwe doctor --fix` with the safety rules defined in the RFC.
- [ ] Add JSON/YAML output for doctor.
- [ ] Wire doctor into the GitHub Action as an optional early step.

### Overview & status

- [ ] Add `--format table` to `overview`.
- [ ] Show ahead/behind against the remote tracking branch when it exists.
- [ ] Surface a clearer “operation in progress” banner when `.git/gitwe/operation.json` is present.

### Testing

- [ ] Expand E2E workflow to cover at least one conflict + `--continue` and one `--abort` scenario.
- [ ] Add a bare-remote fixture that is reused by more engine tests.
- [ ] Snapshot tests for the new JSON envelope shapes.

### Documentation

- [ ] Write a full lifecycle diagram of the finish state machine.
- [ ] Add a “Using gitwe in CI” page with copy-pasteable GitHub Actions and GitLab CI snippets.
- [ ] Document the exact search order for config files and the `--config` / `GITWE_CONFIG` precedence.

### Small features

- [ ] `gitwe version --json`
- [ ] Optional `tagFormat` string on the workflow (simple replacement, e.g. `v{{name}}`).
- [ ] `gitwe config validate` (currently validation only happens on load).

---

## P2 – 1.2 (Power features)

### Multi-remote (RFC-0001)

- [ ] Domain types + parser for the new `remote` object shape.
- [ ] Resolution helpers in `Workflow`.
- [ ] Engine changes for `publish` and the push step of `finish`.
- [ ] CLI flags `--remote` / `--push-to`.
- [ ] Full test coverage and docs.

### New finish strategies (RFC-0002)

- [ ] Extend `MergeStrategy` with `cherry-pick` and `rebase-merge`.
- [ ] Implement both paths inside `FinishOperation` with proper conflict / resume support.
- [ ] Optional CLI flags `--cherry-pick` / `--rebase-merge`.
- [ ] Tests and documentation updates.

### Parity with git-flow / gitflow-avh / git-flow-next

- [ ] Fuller support-branch behaviour.
- [ ] Richer finish flags (`--keep-remote`, `--force-delete`, `--tagname`, …).
- [ ] Stronger custom base support on `start`.
- [ ] `integrate` command for base branches (merge without delete).
- [ ] Optional `allowdirty` behaviour (start from dirty tree when configured).
- [ ] Better `publish` / `track` with push options (`-o`).

### Versioning & Changelog

- [ ] Activate and complete changelog support (aligned with `cliff.toml`).
- [ ] Better prerelease handling.
- [ ] `tagFormat` and richer message options.

### Other

- [ ] Richer `--dry-run` for finish (exact step list + remotes that would be touched).
- [ ] End-to-end support for signed commits and tags.

---

## P3 – 1.3+ (Integration & later)

- [ ] Official, well-documented GitHub Action with proper caching and matrix examples.
- [ ] Basic VS Code extension (start / finish / overview / doctor).
- [ ] Path-based / subdirectory workflow support for monorepos.
- [ ] JSON Schema for the workflow definition published to the Schema Store.
- [ ] Reusable workflow that other repositories can call.
- [ ] Structured hook I/O (for 2.0).
- [ ] Lightweight strategy scripts (for 2.0).

---

## Notes for contributors

- Keep PRs focused. Large items should be split into several issues.
- Tick the checkbox in this file in the same PR that implements the item.
- Fill in the PR template checklist (especially layer boundaries and no duplicate domain concepts).
- Large design changes still require an RFC under `docs/rfcs/`.
