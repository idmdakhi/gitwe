# gitwe TODO

**Last updated:** 2026-09-04
**Current version:** 1.0.0

This file is the single source of truth for planned work.
Items are grouped by priority and target release.
Checkboxes are ticked in Pull Requests; please keep this file up to date.

Parity items with three previous projects are labeled with their names:

- **nvie/gitflow** — <https://github.com/nvie/gitflow> (original git‑flow script, archived)
- **gitflow-avh** — <https://github.com/petervanderdoes/gitflow-avh> (community successor, archived)
- **git-flow-next** — <https://github.com/gittower/git-flow-next> (active Go implementation from Tower, compatible with the above)

---

## Legend

| Priority | Meaning                                         |
| -------- | ----------------------------------------------- |
| **P0**   | Blocker / must be fixed before the next release |
| **P1**   | High value for the next minor release (1.1)     |
| **P2**   | Important features for release 1.2              |
| **P3**   | Nice to have / for later (1.3 and beyond)       |

| Status | Meaning              |
| ------ | -------------------- |
| `[ ]`  | Not started          |
| `[~]`  | In progress          |
| `[x]`  | Done                 |
| `[-]`  | Cancelled / deferred |

---

## P0 – Immediate (1.0.x / early 1.1)

### 1. Architecture Boundary Audit (P0.1)

Core rule (already in [`ARCHITECTURE.md`](docs/architecture/overview.md)):
**`domain` and `application` must never import `infrastructure`.**
This rule is currently enforced only by agreement and review, not by tooling – and a manual audit has already found one live violation.
Scope: audit and harmonize first, **not** blindly rewrite; change code only after completing the reference list below.

- [x] **P0.1-A – Dependency audit.**
      Searched `src/domain/**` and `src/application/**` for any import path containing `../infrastructure/`, `../../infrastructure/`, or `src/infrastructure/`; logged each as a P0 violation.
      **Verified:** `src/application/use-cases/init-workflow.use-case.ts` used `../../domain/config/presets.js` – a direct `application → infrastructure` violation.

- [ ] **P0.1-B – Duplicate symbol audit.**
      Two Preset implementations currently coexist:

  - `src/infrastructure/config/presets.ts` – legacy, still used by `InitWorkflowUseCase`.
  - `src/domain/config/presets.ts` – newer, exports `PresetName`, `PresetOverrides`, `createPreset()`, `getAvailablePresets()`, `isPresetName()`, `PRESET_NAMES`; already used by the `init` CLI command.
    Search the entire code tree for each of: `domain/config/presets`, `PresetName`, `PresetOverrides`, `createPreset`, `getAvailablePresets`, `isPresetName`, `presets[` and log all call sites before making any changes.

- [ ] **P0.1-C – Legacy architecture audit.**
      Following the same pattern as P0.1-A, check whether any other file in `infrastructure/` is directly accessed by domain/application code (other than Presets).

- [ ] **P0.1-D – Canonical file mapping.**
      For each duplicate symbol, decide which implementation is the source of truth. Current decision: `src/domain/config/presets.ts` is canonical.

- [ ] **P0.1-E – Migration plan.**
      Produce an explicit list of `DELETE` / `MOVE` / `MERGE` / `KEEP` / `RENAME`.
      Move `InitWorkflowUseCase`'s import from `infrastructure/config/presets` to `domain/config/presets` – but only after P0.1-A/B/C are complete.

- [ ] **P0.1-F – Boundary tests.**
      Add a lint rule or small script (run in CI) that fails the build if `infrastructure/**` is imported in `domain/**` or `application/**`. Until this is done, the boundary rule in `ARCHITECTURE.md` is a wish, not a requirement.

| Boundary                         | Status | Action                                         |
| -------------------------------- | ------ | ---------------------------------------------- |
| `domain` → `infrastructure`      | 🔴     | Full audit pending (P0.1-A/C)                  |
| `application` → `infrastructure` | 🔴     | At least `InitWorkflowUseCase` (P0.1-A)        |
| Duplicate Preset implementation  | 🔴     | Unify on `domain/config/presets.ts` (P0.1-B/D) |
| `cli` → `application`            | 🟢     | OK                                             |
| `application` → `domain`         | 🟢     | OK                                             |
| `infrastructure` → `domain`      | 🟢     | Expected direction                             |
| `Engine` as facade               | 🟢     | Current design is correct                      |
| Use cases in `application`       | 🟢     | Current design is correct                      |

---

### 2. CI and Release Hygiene

- [ ] Re-enable disabled jobs (`if: false`) in:

  - `.github/workflows/ci.yaml`
  - `.github/workflows/e2e.yaml`
  - `.github/workflows/nightly.yaml`
  - `.github/workflows/release.yaml`
  - Relevant sections of `.github/workflows/publish.yaml`

- [ ] Unify Node.js version across `action.yaml`, `package.json`, and all workflows (preferably a matrix of 20, 22, 24).

- [ ] Improve caching of `node_modules` and `dist` in the composite action and `action.yaml`.

- [ ] Verify that the `publish.yaml` matrix (npm + GitHub Packages) still works after the 1.0 rewrite.

- [ ] **Fix entrypoint in `action.yaml`.**
      Currently runs `${{ github.action_path }}/dist/cli/index.js`, but `package.json#bin` points to `./dist/cli/program.js`; the file the Action calls does not exist after `npm run build`. This blocks usage of the root Action.

- [ ] **Align `action.yaml` command surface with the rewritten CLI.**
      Currently passes flags/commands (`--json`, `--workflow`, `--no-delete`, `--abort-on-conflict`, `--strategy`, `status --root`, `graph`, `doctor`, `config`) that are from before the rewrite and do not exist in `src/cli/program.ts`. Either implement them or reduce Action inputs to the 9 existing commands.

- [ ] **Align `.github/workflows/e2e.yaml`.**
      This file also references `dist/cli/index.js` and pre‑rewrite flags (`--defaults`, `doctor --format json`, `finish --keep`); once `if: false` is removed it will fail for the same reasons as the two above.

---

### 3. Output and CLI Compatibility

- [ ] Add `schemaVersion: 1` to all JSON responses (per RFC-0004).

- [ ] Make `--format json|yaml|table` available for `start`, `finish`, `list`, `version`, `config list`, `doctor`, and `overview`. (The envelope/format infrastructure exists in `cli/output.ts` / `cli/options.ts`, but no command uses it yet.)

- [ ] Consider `--json` as a deprecated alias for `--format json`.

---

### 4. Error Experience Improvements

- [x] Review and improve `hint` strings in `domain/errors/index.ts` and the CLI reporter. _(Covered by the new Troubleshooting guide)_
- [x] Ensure `ConflictError` always shows the exact files and the command to continue or abort. _(Documented in `docs/user-guide/troubleshooting.md`)_
- [x] Add a "Common Issues" section to `docs/commands.md`. _(Replaced by the dedicated `docs/user-guide/troubleshooting.md`)_

---

### 5. Code Quality

- [ ] Perform the architecture boundary audit (P0.1) – this replaces the previous item "Keep layer boundaries clean."

- [ ] Remove or translate remaining Persian comments in the domain layer so the codebase is consistently in English.

- [ ] Increase test coverage for `ShellGitRepository` (especially conflict, ongoing rebase, missing remote, and Windows paths) – currently there are no tests in `tests/infrastructure/`.

- [ ] Support the `GITWE_CONFIG` environment variable as an alternative to `--config`.

---

### 6. Documentation Hygiene

- [x] Add a "Using gitwe in CI" page with copy‑pasteable code for GitHub Actions and GitLab CI. (`docs/user-guide/ci.md` exists and is aligned with the implemented commands.)

- [x] Keep `docs/architecture/overview.md`, `docs/development/testing.md`, `docs/architecture/project-structure.md`, and `docs/user-guide/commands.md` in sync whenever `src/cli/program.ts` adds or removes a command. _(Documentation structure fully reorganized and aligned as of 2026-09-04)_

---

## P1 – 1.1 (Developer Experience & Stability)

### 7. Doctor Command (RFC-0003)

- [ ] Implement `gitwe doctor` (report only). Note: `src/cli/commands/doctor.ts` already exists on disk but is not imported in `program.ts` – first check whether it works with the current `Engine`/use‑case API or needs rewriting.

- [ ] Implement `gitwe doctor --fix` with the safety rules defined in the RFC.

- [ ] Add JSON/YAML output for doctor.

- [ ] Hook doctor into the GitHub Action as an optional initial step.

---

### 8. Overview and Status Improvements

- [ ] Add `--format table` to `overview`.

- [ ] Show ahead/behind status relative to the remote tracking branch (if any).

- [ ] Show a clearer "operation in progress" warning when `.gitwe/state.json` exists.

---

### 9. Testing

- [ ] Extend E2E to cover at least one conflict + `--continue` scenario and one `--abort` scenario (depends on P0 alignment of `action.yaml`/e2e).

- [ ] Add a bare‑remote fixture used in more engine tests.

- [ ] Snapshot tests for the new JSON shape.

---

### 10. Documentation

- [x] Write a complete state‑machine diagram for the finish lifecycle. _(Added `docs/concepts/state-machine.md` with a Mermaid diagram)_
- [x] Document the config file search order and the priority of `--config` / `GITWE_CONFIG`. _(Covered in `docs/user-guide/workflow-definition.md`)_

---

### 11. Small Features

- [ ] `gitwe version --json`

- [ ] Add optional `tagFormat` to workflow (simple replacement, e.g. `v{{name}}`).

- [ ] `gitwe config validate` (distinct from the existing `gitwe validate`; this one would allow `gitwe config` to preview proposed changes before writing).

---

## P2 – 1.2 (Advanced Capabilities)

### 12. Multiple Remotes (RFC-0001)

- [ ] Add domain types and a parser for the new `remote` shape (object).

- [ ] Helper functions in `WorkflowService` for remote resolution.

- [ ] Engine changes for `publish` and the push step in `finish`.

- [ ] Add CLI flags `--remote` / `--push-to`.

- [ ] Full test coverage and documentation.

---

### 13. New Finish Strategies (RFC-0002)

- [ ] Extend the `MergeStrategy` type with `cherry-pick` and `rebase-merge`.

- [ ] Implement both paths in `FinishBranchUseCase` with conflict and resume support.

- [ ] Add optional flags `--cherry-pick` / `--rebase-merge`.

- [ ] Tests and documentation updates.

---

### 14. Parity with nvie/gitflow / gitflow-avh / git-flow-next

| Feature                                                                                                           | Source                          | Status in gitwe                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Arbitrary topic branch types (feature/release/hotfix/support/…)                                                   | nvie/gitflow, AVH               | **Has** – any `branchTypes` entry in the workflow definition immediately becomes `gitwe start/finish <type>`.                                                                                                                                                                                                                  |
| `publish` (push + set upstream)                                                                                   | nvie/gitflow, AVH               | **Has** – `gitwe publish`.                                                                                                                                                                                                                                                                                                     |
| `track` (create a local branch to track an existing remote branch)                                                | nvie/gitflow, AVH               | [ ] Not wired up. `src/cli/commands/track.ts` exists on disk; needs `Engine`/use‑case and re‑wiring into `program.ts`.                                                                                                                                                                                                         |
| `pull` (fetch + track, deprecated upstream in favor of `track`)                                                   | nvie/gitflow, AVH               | [-] Intentionally not planned – go straight to `track`, matching where upstream ended.                                                                                                                                                                                                                                         |
| `-k`/`--keep` (keep branch after finish)                                                                          | nvie/gitflow, AVH               | [ ] Not implemented. Tracked as part of "richer finish flags" below.                                                                                                                                                                                                                                                           |
| `rename <new-name>`                                                                                               | AVH                             | [ ] Not wired up. `src/cli/commands/rename.ts` exists on disk; needs re‑wiring, similar to `track`.                                                                                                                                                                                                                            |
| `allowdirty` (start from a dirty working tree if set)                                                             | AVH                             | [ ] Not implemented – add as an optional `start.allowDirty` field in the workflow definition.                                                                                                                                                                                                                                  |
| `--showcommands` / verbose logging of git commands                                                                | AVH                             | **Has** – `-v, --verbose` globally in the program.                                                                                                                                                                                                                                                                             |
| Choose whether to push branches/tags affected by `finish`                                                         | AVH                             | **Has** – `gitwe finish --push` (default off).                                                                                                                                                                                                                                                                                 |
| Fix: error deleting a remote branch that was already deleted                                                      | AVH                             | [ ] Verify that `ShellGitRepository.deleteRemoteBranch` handles the error gracefully; otherwise add a regression test.                                                                                                                                                                                                         |
| Shortcut commands that infer the topic type from the current branch (`git flow finish`, `git flow rebase`)        | git-flow-next                   | **Has**, differently – `gitwe finish`/`update`/`publish`/`delete` already default `[name]` to the current branch; gitwe never needed a type‑inferring shortcut because its commands are not namespaced by type in the CLI.                                                                                                     |
| Check remote sync before `finish` (local must be up to date with remote)                                          | git-flow-next                   | [ ] Verify that `FinishBranchUseCase` does this; if not, add it (`-f, --force` to bypass).                                                                                                                                                                                                                                     |
| Layered config priority per branch type: branch‑type default → command‑specific override → CLI flag (always wins) | git-flow-next                   | Partially has – the workflow definition already gives per‑type defaults (`merge.squash.branchTypes`, `versioning.bumpRules`, etc.) which CLI flags like `--squash` override. What's missing is a command‑specific middle layer (e.g., "squash by default, but not when called from CI") – log as a P3 idea if there is demand. |
| Commit/merge message templates per type (`gitflow.<type>.finish.mergeMessage`, `...updateMessage`)                | git-flow-next                   | [ ] Not implemented – see "richer message options" under Versioning and Changelog below.                                                                                                                                                                                                                                       |
| Signed commits/tags, per type (`gitflow.release.finish.sign`, `.signingkey`)                                      | git-flow-next                   | [ ] Not implemented – tracked under "Full support for signed commits and tags" below.                                                                                                                                                                                                                                          |
| Support branch behavior (forward‑only merge, never back)                                                          | nvie/gitflow, AVH               | Partially has – `support` is a valid `branchTypes` entry in the `classic` preset, but its distinct behavior (forward‑only merge, typically from `main`/a tag, long‑lived) is not specifically modeled – today it behaves like any other topic type.                                                                            |
| `integrate` command for base branches (merge a base branch into a child without deleting it)                      | AVH (release/support workflows) | [ ] Not implemented.                                                                                                                                                                                                                                                                                                           |
| Pass push options in `publish`/`track` (`-o <push-option>`, for GitLab/Gerrit/Gitea)                              | AVH                             | [ ] Not implemented.                                                                                                                                                                                                                                                                                                           |
| Richer finish flags generally (`--keep-remote`, `--force-delete`, `--tagname`, `--no-tag`)                        | AVH, git-flow-next              | [ ] Not implemented – replaces the previous item of the same name.                                                                                                                                                                                                                                                             |
| Stronger custom `base` support in `start`                                                                         | AVH, git-flow-next              | Partially has – `gitwe start <type> <name> [base]` already accepts an override; what's missing is validating `[base]` against the workflow's allowed bases in the AVH/`git-flow-next` manner.                                                                                                                                  |

---

### 15. Versioning and Changelog

- [ ] Enable and complete changelog support (aligned with `cliff.toml`).

- [ ] Improve prerelease management.

- [ ] `tagFormat` and richer message options (see the per‑type message template row in the parity table above).

---

### 16. Other

- [ ] Richer `--dry-run` for finish (detailed list of steps + remotes that will be affected).

- [ ] Full support for signed commits and tags (see the parity table above).

---

## P3 – 1.3 and Beyond (Integration & Future)

- [ ] Official, documented GitHub Action with proper caching and matrix examples (blocked by P0 `action.yaml` items).

- [ ] Basic VS Code extension (start / finish / overview / doctor) – `git-flow-next` already has one (<https://github.com/gittower/git-flow-next-vs-code-extension>) that is worth reviewing before starting from scratch.

- [ ] Support workflows in subdirectories / paths for monorepos.

- [ ] Publish a JSON Schema for workflow definitions to Schema Store.

- [ ] Reusable workflow that other repositories can call.

- [ ] Structured I/O for hooks (for version 2.0).

- [ ] Lightweight strategy scripts (for version 2.0).

---

## Notes for Contributors

- Keep Pull Requests focused. Large items should be split into multiple issues.
- Tick the checkbox in this file in the same PR that implements the item.
- Fill out the PR template checklist (especially layer boundaries and no duplicate concepts in domain).
- Major design changes still require an RFC in `docs/development/rfcs/`.
- Before marking a parity item as "Has", check `src/cli/program.ts` – the existence of a file in `src/cli/commands/` does not mean it is accessible from the `gitwe` binary. Refer to the [Command Reference](docs/user-guide/commands.md).
