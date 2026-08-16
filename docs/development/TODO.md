# gitwe TODO

Last updated: 2026-08-16
Current version: **1.0.0**

This file is the single source of truth for planned work.
Items are grouped by priority and target release.
Checkboxes can be ticked in PRs; please keep the file up to date.

Feature-parity items reference three prior art projects by name:

- **nvie/gitflow** — <https://github.com/nvie/gitflow> — the original git-flow script; archived, points adopters at git-flow-next.
- **gitflow-avh** — <https://github.com/petervanderdoes/gitflow-avh> — the long-lived community fork/successor to nvie/gitflow; archived.
- **git-flow-next** — <https://github.com/gittower/git-flow-next> — the actively maintained Go reimplementation from Tower, backward-compatible with the two above.

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

### Architecture Boundary Audit (P0.1)

Canonical rule (already in [`ARCHITECTURE.md`](../ARCHITECTURE.md)):
`domain` and `application` never import `infrastructure`. This is currently
enforced only by convention/review, not by tooling — and a manual audit
already found a live violation. Scope: audit and canonicalise first, **don't**
refactor blind; only touch code once the reference list below is complete.

- [ ] **P0.1-A — Dependency audit.** Grep `src/domain/**` and `src/application/**`
      for any import path containing `../infrastructure/`, `../../infrastructure/`,
      or `src/infrastructure/`; log every hit as a P0 violation.
      **Confirmed:** `src/application/use-cases/init-workflow.use-case.ts` imports
      `PresetName` and `presets` from `../../domain/config/presets.js` — a
      direct `application → infrastructure` violation.
- [ ] **P0.1-B — Duplicate symbol audit.** Two Preset implementations
      currently exist side by side:
  - `src/infrastructure/config/presets.ts` — legacy, still imported by
    `InitWorkflowUseCase`.
  - `src/domain/config/presets.ts` — newer, exports `PresetName`,
    `PresetOverrides`, `createPreset()`, `getAvailablePresets()`,
    `isPresetName()`, `PRESET_NAMES`; already used by the CLI's `init`
    command. This is an in-progress, incomplete migration.
    Search the whole tree for every one of: `infrastructure/config/presets`,
    `domain/config/presets`, `PresetName`, `PresetOverrides`, `createPreset`,
    `getAvailablePresets`, `isPresetName`, `presets[` — and record every caller
    before changing anything.
- [ ] **P0.1-C — Legacy architecture audit.** Using the same grep pattern as
      P0.1-A, check for any other file under `infrastructure/` that
      domain/application code reaches into directly beyond Presets.
- [ ] **P0.1-D — Canonical file map.** Decide, per duplicated symbol, which
      implementation is the source of truth. Decision so far:
      `src/domain/config/presets.ts` is canonical; `src/infrastructure/config/presets.ts`
      is not, and must not gain new callers in the meantime.
- [ ] **P0.1-E — Migration plan.** Produce an explicit `DELETE` / `MOVE` /
      `MERGE` / `KEEP` / `RENAME` list before touching behaviour.
      `InitWorkflowUseCase`'s import moves from `KEEP` to `MOVE` (onto
      `domain/config/presets.ts`) here — but only once P0.1-A/B/C are done, not
      before.
- [ ] **P0.1-F — Boundary tests.** Add a lint rule or a small script (run in
      CI) that fails the build on any `domain/**` or `application/**` import of
      `infrastructure/**`, so this class of regression can't reappear silently.
      Until this exists, the boundary rule in `ARCHITECTURE.md` is aspirational,
      not enforced.

| Boundary                         | Status | Action                                                |
| -------------------------------- | ------ | ----------------------------------------------------- |
| `domain` → `infrastructure`      | 🔴     | Full audit pending (P0.1-A/C)                         |
| `application` → `infrastructure` | 🔴     | At least `InitWorkflowUseCase` (P0.1-A)               |
| Duplicate Presets implementation | 🔴     | Canonicalise on `domain/config/presets.ts` (P0.1-B/D) |
| `cli` → `application`            | 🟢     | OK                                                    |
| `application` → `domain`         | 🟢     | OK                                                    |
| `infrastructure` → `domain`      | 🟢     | Expected direction                                    |
| `Engine` as facade               | 🟢     | Current design is correct                             |
| Use cases under `application`    | 🟢     | Current design is correct                             |

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
- [ ] **Fix `action.yaml`'s entrypoint.** It runs `${{ github.action_path }}/dist/cli/index.js`, but `package.json#bin` builds `./dist/cli/program.js`; the file the Action calls does not exist after `npm run build`. Blocks every use of the root Action until fixed.
- [ ] **Re-align `action.yaml`'s command surface with the rewritten CLI.** It currently passes flags/commands (`--json`, `--workflow`, `--no-delete`, `--abort-on-conflict`, `--strategy`, `status --root`, `graph`, `doctor`, `config`) that predate the Clean Architecture rewrite and don't exist in `src/cli/program.ts` (see the "Not yet available" list in `docs/commands.md`). Either implement them or trim the Action's inputs to the nine commands that exist today.
- [ ] **Re-align `.github/workflows/e2e.yaml`** — it also targets `dist/cli/index.js` and pre-rewrite flags (`--defaults`, `doctor --format json`, `finish --keep`); it will fail as soon as its `if: false` guard is lifted, for the same reasons as the two items above.

### Output & CLI consistency

- [ ] Add `schemaVersion: 1` to every JSON response (see RFC-0004).
- [ ] Make `--format json|yaml|table` available on `start`, `finish`, `list`, `version`, `config list`, `doctor` and `overview`. (The envelope/format plumbing already exists in `cli/output.ts` / `cli/options.ts` — no command currently calls it.)
- [ ] Treat the old `--json` flag as a deprecated alias for `--format json`.

### Error experience

- [ ] Review and improve all `hint` strings in `domain/errors/index.ts` and the CLI reporter.
- [ ] Ensure ConflictError always lists the exact files and the exact resume command.
- [ ] Add a short "common problems" section to `docs/commands.md`.

### Code quality

- [ ] See **Architecture Boundary Audit (P0.1)** above — this supersedes and details the old one-line "keep layer boundaries clean" note that used to live here.
- [ ] Remove or translate remaining Persian comments in the domain layer so the codebase is consistently English.
- [ ] Raise test coverage on `ShellGitRepository` (especially conflict, rebase-in-progress, missing-remote and Windows paths) — there is currently no `tests/infrastructure/` suite at all.
- [ ] Support `GITWE_CONFIG` environment variable as an alternative to `--config`.

### Documentation hygiene

- [x] ~~Add a "Using gitwe in CI" page with copy-pasteable GitHub Actions and GitLab CI snippets.~~ Done — `docs/using-in-ci.md` exists and is kept in sync with the commands actually implemented.
- [ ] Keep `docs/ARCHITECTURE.md`, `docs/development/testing.md`, `docs/structure.md` and `docs/commands.md` in sync whenever `src/cli/program.ts` gains or loses a wired command — these four files were rewritten from scratch on 2026-08-16 because they had drifted from the code (missing files, a stale `src/` layout, and command docs describing an unwired CLI surface).

---

## P1 – 1.1 (DX & robustness)

### Doctor (RFC-0003)

- [ ] Implement `gitwe doctor` (report-only). Note: `src/cli/commands/doctor.ts` already exists on disk from a prior iteration but is not imported by `program.ts` — start by checking whether it's salvageable against the current `Engine`/use-case API before writing it from scratch.
- [ ] Implement `gitwe doctor --fix` with the safety rules defined in the RFC.
- [ ] Add JSON/YAML output for doctor.
- [ ] Wire doctor into the GitHub Action as an optional early step.

### Overview & status

- [ ] Add `--format table` to `overview`.
- [ ] Show ahead/behind against the remote tracking branch when it exists.
- [ ] Surface a clearer "operation in progress" banner when `.gitwe/state.json` is present.

### Testing

- [ ] Expand E2E workflow to cover at least one conflict + `--continue` and one `--abort` scenario (blocked on the `action.yaml`/e2e re-alignment items in P0 above).
- [ ] Add a bare-remote fixture that is reused by more engine tests.
- [ ] Snapshot tests for the new JSON envelope shapes.

### Documentation

- [ ] Write a full lifecycle diagram of the finish state machine (a prose version now lives in `docs/ARCHITECTURE.md#the-resumable-finish-operation`; a diagram is still open).
- [ ] Document the exact search order for config files and the `--config` / `GITWE_CONFIG` precedence.

### Small features

- [ ] `gitwe version --json`
- [ ] Optional `tagFormat` string on the workflow (simple replacement, e.g. `v{{name}}`).
- [ ] `gitwe config validate` (distinct from the existing top-level `gitwe validate`; this one would let `gitwe config` preview a proposed edit before writing it).

---

## P2 – 1.2 (Power features)

### Multi-remote (RFC-0001)

- [ ] Domain types + parser for the new `remote` object shape.
- [ ] Resolution helpers in `WorkflowService`.
- [ ] Engine changes for `publish` and the push step of `finish`.
- [ ] CLI flags `--remote` / `--push-to`.
- [ ] Full test coverage and docs.

### New finish strategies (RFC-0002)

- [ ] Extend the merge-strategy type with `cherry-pick` and `rebase-merge`.
- [ ] Implement both paths inside `FinishBranchUseCase` with proper conflict / resume support.
- [ ] Optional CLI flags `--cherry-pick` / `--rebase-merge`.
- [ ] Tests and documentation updates.

### Parity with nvie/gitflow / gitflow-avh / git-flow-next

Concrete, per-project feature comparison — see the links at the top of this
file. "Have" means gitwe's current design already covers the intent, even if
the mechanism differs (gitwe is config-driven and flat rather than
subcommand-per-type).

| Feature                                                                                                             | Source                          | gitwe status                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arbitrary named topic-branch types (feature/release/hotfix/support/...)                                             | nvie/gitflow, AVH               | **Have** — any `branchTypes` entry in the workflow definition becomes a `gitwe start/finish <type>` immediately.                                                                                                                                                                                                                        |
| `publish` (push + set upstream)                                                                                     | nvie/gitflow, AVH               | **Have** — `gitwe publish`.                                                                                                                                                                                                                                                                                                             |
| `track` (create a local branch tracking an existing remote one)                                                     | nvie/gitflow, AVH               | [ ] Not wired. `src/cli/commands/track.ts` exists on disk from a prior iteration; needs an `Engine`/use-case and re-wiring into `program.ts`.                                                                                                                                                                                           |
| `pull` (fetch + track, deprecated upstream in favour of `track`)                                                    | nvie/gitflow, AVH               | [-] Intentionally not planned — go straight to `track`, matching where upstream ended up.                                                                                                                                                                                                                                               |
| `-k`/`--keep` (keep branch after finish)                                                                            | nvie/gitflow, AVH               | [ ] Not implemented. Tracked as part of "richer finish flags" below.                                                                                                                                                                                                                                                                    |
| `rename <new-name>`                                                                                                 | AVH                             | [ ] Not wired. `src/cli/commands/rename.ts` exists on disk; needs re-wiring, same as `track`.                                                                                                                                                                                                                                           |
| `allowdirty` (start from a dirty working tree when configured)                                                      | AVH                             | [ ] Not implemented — add as an optional `start.allowDirty` field on the workflow definition.                                                                                                                                                                                                                                           |
| `--showcommands` / verbose git-command logging                                                                      | AVH                             | **Have** — `-v, --verbose` on the global program.                                                                                                                                                                                                                                                                                       |
| Push-or-not choice for the branches/tag touched by `finish`                                                         | AVH                             | **Have** — `gitwe finish --push` (default off).                                                                                                                                                                                                                                                                                         |
| Fix: error deleting an already-gone remote branch                                                                   | AVH                             | [ ] Verify `ShellGitRepository.deleteRemoteBranch` degrades gracefully; add a regression test if not.                                                                                                                                                                                                                                   |
| Shorthand commands that infer the topic type from the current branch (`git flow finish`, `git flow rebase`)         | git-flow-next                   | **Have**, differently — `gitwe finish`/`update`/`publish`/`delete` already default `[name]` to the current branch; gitwe never needed a _type_-inferring shorthand because its commands aren't namespaced by type on the CLI to begin with.                                                                                             |
| Remote-sync check before `finish` (local must be up to date with remote)                                            | git-flow-next                   | [ ] Verify whether `FinishBranchUseCase` does this today; if not, add it (see `-f, --force` in the roadmap notes for how to skip it).                                                                                                                                                                                                   |
| Layered per-branch-type config precedence: branch-type default → command-specific override → CLI flag (always wins) | git-flow-next                   | Partially have — the workflow definition already gives per-type defaults (`merge.squash.branchTypes`, `versioning.bumpRules`, etc.) that CLI flags like `--squash` already override. What's missing is a _command-specific_ middle layer (e.g. "squash by default, but not when called from CI") — file as a P3 idea if there's demand. |
| Per-type merge/update commit-message templates (`gitflow.<type>.finish.mergeMessage`, `...updateMessage`)           | git-flow-next                   | [ ] Not implemented — see "richer message options" under Versioning & Changelog below.                                                                                                                                                                                                                                                  |
| Signed commits/tags, per-type (`gitflow.release.finish.sign`, `.signingkey`)                                        | git-flow-next                   | [ ] Not implemented — tracked under "End-to-end support for signed commits and tags" below.                                                                                                                                                                                                                                             |
| Support-branch behaviour (branch that only ever merges forward, never back)                                         | nvie/gitflow, AVH               | Partially have — `support` is already a valid `branchTypes` entry in the `classic` preset (see `README.md`), but its distinct _behaviour_ (only forward-merges, typically off `main`/a tag, long-lived) isn't specially modeled — it behaves like any other topic type today.                                                           |
| `integrate` command for base branches (merge a base branch into a child without deleting it)                        | AVH (release/support workflows) | [ ] Not implemented.                                                                                                                                                                                                                                                                                                                    |
| Push options passthrough on `publish`/`track` (`-o <push-option>`, for GitLab/Gerrit/Gitea)                         | AVH                             | [ ] Not implemented.                                                                                                                                                                                                                                                                                                                    |
| Richer finish flags in general (`--keep-remote`, `--force-delete`, `--tagname`, `--no-tag`)                         | AVH, git-flow-next              | [ ] Not implemented — supersedes the old bullet of the same name.                                                                                                                                                                                                                                                                       |
| Stronger custom base support on `start`                                                                             | AVH, git-flow-next              | Partially have — `gitwe start <type> <name> [base]` already accepts an override; what's missing is validating `[base]` against the workflow's allowed bases the way AVH/`git-flow-next` do.                                                                                                                                             |

### Versioning & Changelog

- [ ] Activate and complete changelog support (aligned with `cliff.toml`).
- [ ] Better prerelease handling.
- [ ] `tagFormat` and richer message options (see the per-type message-template row in the parity table above).

### Other

- [ ] Richer `--dry-run` for finish (exact step list + remotes that would be touched).
- [ ] End-to-end support for signed commits and tags (see the parity table above).

---

## P3 – 1.3+ (Integration & later)

- [ ] Official, well-documented GitHub Action with proper caching and matrix examples (blocked on the P0 `action.yaml` items above).
- [ ] Basic VS Code extension (start / finish / overview / doctor) — `git-flow-next` already ships one (<https://github.com/gittower/git-flow-next-vs-code-extension>) worth a design look before starting from scratch.
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
- Large design changes still require an RFC under `docs/development/rfcs/`.
- Before marking a parity item "Have", check `src/cli/program.ts` — a file existing under `src/cli/commands/` does not mean it's reachable from the `gitwe` binary. See `docs/commands.md`.
