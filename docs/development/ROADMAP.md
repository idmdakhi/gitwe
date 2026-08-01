# gitwe Roadmap

Last updated: 2026-08-01  
Current version: **1.0.0**

This document describes the planned evolution of gitwe.  
Detailed work items live in [`TODO.md`](./TODO.md); design proposals live in [`docs/rfcs/`](./docs/rfcs/).

---

## Overview

| Phase                           | Timeframe  | Focus                            | Key outcomes                                                                        |
| ------------------------------- | ---------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| **1.1 – Stability & DX**        | 1–2 months | Quality and developer experience | Test coverage > 90 %, fuller docs, re-enabled CI                                    |
| **1.2 – Advanced capabilities** | 2–3 months | More power without complexity    | Multi-remote, richer finish strategies, doctor --fix                                |
| **1.3 – Integration**           | 3–4 months | Ecosystem                        | Official GitHub Action, basic VS Code extension, monorepo support                   |
| **2.0 – Extensibility**         | 6+ months  | Extensibility                    | Lightweight strategy scripts, structured hooks (no return to the old plugin system) |

---

## Phase 1.1 – Stability & DX

**Goal:** Make the 1.0 foundation rock-solid and pleasant to use day-to-day.

### Planned work

- Re-enable and stabilise all currently disabled GitHub workflows:
  - `ci.yaml`
  - `e2e.yml`
  - `nightly.yml`
  - `release.yml`
- Raise test coverage above 90 % on non-CLI code (especially `ShellGitRepository` edge cases).
- Improve error messages and hints across the CLI.
- Add `--format table` to `overview`.
- Introduce stable machine-readable output (`schemaVersion`) for the main commands (see [RFC-0004](./docs/rfcs/0004-machine-readable-output.md)).
- Implement `gitwe doctor` and a safe `--fix` mode (see [RFC-0003](./docs/rfcs/0003-doctor-auto-repair.md)).
- Complete English documentation for custom workflows; optional community Persian translation.
- Align Node.js versions across `action.yaml`, workflows and `package.json`.

### Success criteria

- All CI jobs are green on every PR.
- `gitwe doctor` reports and can safely repair the most common problems.
- JSON/YAML output is consistent and versioned.
- New contributors can follow the docs without asking basic questions on Discussions.

---

## Phase 1.2 – Advanced capabilities

**Goal:** Give power users the flexibility they need while keeping the simple path simple.

### Planned work

- Multi-remote and remote strategy support ([RFC-0001](./docs/rfcs/0001-multi-remote.md)).
- New finish strategies: `cherry-pick` and `rebase-merge` ([RFC-0002](./docs/rfcs/0002-finish-strategies.md)).
- Richer `--dry-run` for finish (exact step list + remotes that would be touched).
- End-to-end support for signed commits and tags.
- Optional simple `tagFormat` on the workflow definition.
- `--message-file` for merge / squash / tag messages.

### Success criteria

- A workflow can push to multiple remotes with a single `finish --push`.
- Teams that prefer cherry-pick or “rebase and merge” history can express it in the definition.
- No regression in the existing three strategies (`merge`, `squash`, `rebase`).

---

## Phase 1.3 – Integration

**Goal:** Make gitwe a natural citizen of the wider development ecosystem.

### Planned work

- Official, well-documented GitHub Action with proper caching and matrix examples.
- Basic VS Code extension (start / finish / overview / doctor).
- Path-based / subdirectory workflow support for monorepos.
- JSON Schema for `gitwe.json` published to the Schema Store.
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
- Lightweight “strategy scripts”: an executable that receives context and returns the git operations to run.
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
5. **Simplicity over features** – every new capability must justify the added cognitive load.

---

## How this document evolves

- Dates and phase boundaries are approximate; they shift with contributor availability.
- Concrete tasks are tracked in [`TODO.md`](./TODO.md).
- Breaking changes or large design shifts require an RFC under [`docs/rfcs/`](./docs/rfcs/).
- Once a phase is released, its section is moved to a short “Completed” list at the bottom of this file (or into the CHANGELOG).

---

## Completed (for reference)

| Version | Date       | Highlights                                                                                                                                    |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-07-31 | First stable release – full rewrite, Clean Architecture, classic / github / gitlab presets, resumable finish, hooks, generated topic commands |
