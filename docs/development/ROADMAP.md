# gitwe Roadmap

Last updated: 2026-08-16
Current version: **1.0.0**

This document describes the planned evolution of gitwe.
Detailed work items live in [`TODO.md`](./TODO.md), including a full
per-feature parity matrix against three prior-art projects:

- [nvie/gitflow](https://github.com/nvie/gitflow) — the original git-flow script (archived).
- [gitflow-avh](https://github.com/petervanderdoes/gitflow-avh) — the long-lived community successor (archived).
- [git-flow-next](https://github.com/gittower/git-flow-next) — the actively maintained Go reimplementation, backward-compatible with both of the above.

Design proposals live in [`docs/rfcs/`](./rfcs/).

---

## Overview

| Phase                           | Timeframe  | Focus                            | Key outcomes                                                                                      |
| ------------------------------- | ---------- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| **1.1 – Stability & DX**        | 1–2 months | Quality and developer experience | Test coverage > 90 %, fuller docs, re-enabled CI, complete doctor, stable machine-readable output |
| **1.2 – Advanced capabilities** | 2–3 months | More power without complexity    | Multi-remote, richer finish strategies, better parity with git-flow / gitflow-avh / git-flow-next |
| **1.3 – Integration**           | 3–4 months | Ecosystem                        | Official GitHub Action improvements, basic VS Code extension, monorepo support                    |
| **2.0 – Extensibility**         | 6+ months  | Extensibility                    | Lightweight strategy scripts, structured hooks (no return to the old plugin system)               |

---

## Phase 1.1 – Stability & DX

**Goal:** Make the 1.0 foundation rock-solid and pleasant to use day-to-day.

### Planned work

- **Architecture boundary audit (P0.1, see `TODO.md`).** A manual audit
  already found a confirmed `application → infrastructure` violation
  (`InitWorkflowUseCase` importing from `domain/config/presets.ts`)
  and an in-progress,. Finish the audit, canonicalise on the
  domain-layer implementation, and — critically — add an automated boundary
  check (lint rule or CI script) so `domain`/`application` importing
  `infrastructure` fails the build instead of relying on review to catch it.
- Re-enable and stabilise all currently disabled GitHub workflows (`if: false`).
- Fix the root `action.yaml` entrypoint (it currently points at a build
  output path — `dist/cli/index.js` — that `npm run build` does not
  produce; see `TODO.md` P0) and re-align its command/flag surface with the
  rewritten CLI documented in [`commands.md`](../commands.md).
- Align Node.js versions across `action.yaml`, `package.json` engines and all workflows (prefer 20 + 22 + 24 matrix).
- Improve caching in the composite Action and the root `action.yaml`.
- Introduce stable machine-readable output with `schemaVersion: 1` for all major commands (see [RFC-0004](./rfcs/0004-machine-readable-output.md)).
- Make `--format text|json|yaml|table` available on every major command.
- Implement `gitwe doctor` and a safe `--fix` mode (see [RFC-0003](./rfcs/0003-doctor-auto-repair.md)).
- Improve `overview` / `status` (remote ahead/behind, clear "operation in progress" banner, table format).
- Raise test coverage above 90 % on non-CLI code (especially `ShellGitRepository` edge cases and conflict/abort paths — there is currently no `tests/infrastructure/` suite at all).
- Improve error messages and hints across the CLI.
- Keep `docs/ARCHITECTURE.md`, `docs/structure.md`, `docs/commands.md` and `docs/development/testing.md` in lock-step with `src/cli/program.ts` — these were rewritten on 2026-08-16 after drifting from an earlier, larger command surface that was never fully wired in.

### Success criteria

- All CI jobs are green on every PR.
- `gitwe doctor` reports and can safely repair the most common problems.
- JSON/YAML output is consistent and versioned.
- New contributors can follow the docs without asking basic questions on Discussions.
- Zero `domain`/`application` imports of `infrastructure` remain, and a CI
  check fails the build if a new one is introduced (P0.1-F in `TODO.md`).
- Exactly one Preset implementation exists (`domain/config/presets.ts`);.

---

## Phase 1.2 – Advanced capabilities

**Goal:** Give power users the flexibility they need while keeping the simple path simple.

### Planned work

- Multi-remote and remote strategy support ([RFC-0001](./rfcs/0001-multi-remote.md)).
- New finish strategies: `cherry-pick` and `rebase-merge` ([RFC-0002](./rfcs/0002-finish-strategies.md)).
- Richer `--dry-run` for finish (exact step list + remotes that would be touched).
- End-to-end support for signed commits and tags.
- **Parity with nvie/gitflow / gitflow-avh / git-flow-next** — see the full
  item-by-item matrix in [`TODO.md`](./TODO.md#parity-with-nviegitflow--gitflow-avh--git-flow-next).
  In short:
  - Already covered by gitwe's design, just via a different mechanism:
    arbitrary named topic types, `publish`, push-or-not on `finish`,
    verbose git-command logging, current-branch defaulting on
    `finish`/`update`/`publish`/`delete` (gitwe's equivalent of git-flow-next's
    branch-type-inferring shorthands).
  - Genuinely missing and worth picking up: `track`, `rename` (both have
    unwired command files already sitting in `src/cli/commands/` from an
    earlier iteration — re-wiring may be cheaper than a rewrite), an
    `allowdirty` workflow option, an `integrate` command for base branches,
    push-option passthrough (`-o`) on `publish`, and a fuller `--keep`
    /`--keep-remote`/`--force-delete`/`--tagname` flag set on `finish`.
  - Worth adapting rather than copying: git-flow-next's three-layer config
    precedence (branch-type default → command-specific override → CLI flag
    always wins). gitwe's file-based workflow definition already plays the
    role of layer one; a command-specific override layer is the interesting
    open question, not the CLI-flag layer (gitwe already has that).
  - Explicitly deferred: `pull` — upstream itself deprecated this in favour
    of `track`, so gitwe goes straight to `track` and skips it.
- Optional simple `tagFormat` on the workflow definition.
- Activate and complete changelog support (aligned with `cliff.toml`).
- Better prerelease handling.

### Success criteria

- A workflow can push to multiple remotes with a single `finish --push`.
- Teams that prefer cherry-pick or "rebase and merge" history can express it in the definition.
- No regression in the existing three strategies (`merge`, `squash`, `rebase`).
- The parity matrix in `TODO.md` has no unreviewed "not implemented" rows left
  in the "genuinely missing" group above.

---

## Phase 1.3 – Integration

**Goal:** Make gitwe a natural citizen of the wider development ecosystem.

### Planned work

- Official, well-documented GitHub Action with proper caching and matrix examples (blocked on the `action.yaml` fixes in Phase 1.1).
- Basic VS Code extension (start / finish / overview / doctor). `git-flow-next`
  already ships a comparable extension
  (<https://github.com/gittower/git-flow-next-vs-code-extension>) — worth
  reviewing its command palette and activity-bar design before building
  gitwe's from scratch.
- Path-based / subdirectory workflow support for monorepos.
- JSON Schema for the workflow definition published to the Schema Store.
- Reusable workflow that other repositories can call.

### Success criteria

- A new repository can adopt gitwe with a few lines of Actions YAML.
- Monorepo users can keep independent workflow definitions per package if desired.
- The VS Code extension covers the daily commands without leaving the editor.

---

## Phase 2.0 – Extensibility

**Goal:** Allow advanced customisation without re-introducing the complexity of the pre-1.0 plugin system.

### Planned work

- Structured hook I/O (JSON on stdin, clear exit-code contract).
- Lightweight "strategy scripts": an executable that receives context and returns the git operations to run.
- Explicit non-goal: a general-purpose plugin loader or extension marketplace.

### Success criteria

- Power users can implement organisation-specific merge or tagging policies with a small script.
- The core engine and the Clean Architecture boundaries remain unchanged.
- Documentation clearly explains the supported extension points and their limits.

---

## Guiding principles (unchanged)

1. **Workflow rules live in data**, not in hard-coded if/else.
2. **Clean Architecture** – domain and application never import infrastructure or CLI.
3. **Resumability** – long-running operations (especially finish) must be continuable and abortable.
4. **Safety first** – never delete or rewrite history without an explicit flag; prefer fail-fast over silent data loss.
5. **Simplicity over features** – every new capability must justify the added cognitive load, including parity items borrowed from git-flow / gitflow-avh / git-flow-next: match their _outcome_, not necessarily their exact flag or subcommand shape, when gitwe's flatter, config-driven design already gets there differently.

---

## How this document evolves

- Dates and phase boundaries are approximate; they shift with contributor availability.
- Concrete tasks, including the full parity matrix, are tracked in [`TODO.md`](./TODO.md).
- Breaking changes or large design shifts require an RFC under [`docs/development/rfcs/`](./rfcs/).
- Once a phase is released, its section is moved to a short "Completed" list at the bottom of this file (or into the CHANGELOG).

---

## Completed (for reference)

| Version | Date       | Highlights                                                                                                                                    |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-07-31 | First stable release – full rewrite, Clean Architecture, classic / github / gitlab presets, resumable finish, hooks, generated topic commands |
