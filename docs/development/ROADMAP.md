# Roadmap

Current version: **1.0.0**. This page replaces the previous separate
`ROADMAP.md` and `TODO.md` — one prioritised list, checked against the
current source rather than carried forward from planning notes. Design
proposals for larger items live in [RFCs](./rfcs/README.md).

Status markers below reflect what's actually implemented in `src/` today,
verified while writing this page (not assumed from older docs):

- ✅ done
- 🟡 partially done
- ⬜ not started

## P0 — now

| Item | Status | Notes |
| --- | --- | --- |
| Fix `action.yaml` | 🟡 | Points at the correct build path (`dist/cli/index.js`), but still passes flags the current CLI rejects: a global `--json` instead of `--format json`, `--workflow` instead of `init --preset`, and `--abort-on-conflict`/`--strategy` on `finish`, neither of which exists there. See [ci.md](../guides/ci.md#the-official-github-action). |
| Fix `e2e.yaml`'s conflict scenarios | ⬜ | Uses a `finish --strategy merge` flag that doesn't exist, and checks for a stale `.gitwe/operation.json` path instead of the real `.git/gitwe/operation.json`. Both currently "pass" only because the steps are wrapped in `set +e`/`\|\| true`. See [testing.md](./testing.md#what-isnt-covered-yet). |
| Architecture boundary audit | ✅ | The specific violation this item used to describe (`InitWorkflowUseCase` importing presets from an infrastructure path) doesn't exist as stated — `presets.ts` already lives under `domain/config/`, so importing it from `application` is a same-layer, not cross-layer, import. No `domain`/`application` file currently imports `infrastructure` or `cli`. An automated boundary check (lint rule or CI script) to keep it that way is still worth adding. |
| Keep docs in lock-step with `src/cli/program.ts` | ✅ | This documentation pass (`docs/`) was rewritten directly from the current source rather than carried forward — see [commands.md](../guides/commands.md) for the full, current command list (27 commands, several of which older docs described as unimplemented). |

## P1 — 1.1: stability & DX

| Item | Status | Notes |
| --- | --- | --- |
| `gitwe doctor` + safe `--fix` | ✅ | Implemented — see [RFC-0003](./rfcs/0003-doctor-auto-repair.md) (status updated) and [commands.md](../guides/commands.md#gitwe-doctor). |
| Machine-readable output (`schemaVersion: 1` envelope) | ✅ | Implemented for `--format json`/`--format yaml` across every command — see [RFC-0004](./rfcs/0004-machine-readable-output.md) (status updated). |
| `--format table` | 🟡 | The flag is accepted everywhere, but renders identically to `text` — no real tabular layout yet. |
| Published JSON Schema documents | ⬜ | `docs/schemas/` referenced in RFC-0004 doesn't exist yet. |
| Raise test coverage on `ShellGitRepository` | ⬜ | Still no `tests/infrastructure/` suite; the adapter is only covered by `e2e.yaml` end-to-end (see above for its known gaps). |
| Application-layer use-case test coverage | ✅ | Every use case in `src/application/use-cases/` now has a matching test file in `tests/application/`. |
| Improve error messages/hints | 🟡 | `GitweError` subclasses already carry a `hint` field surfaced by the CLI and JSON/YAML `error.hint`; ongoing work is filling in better hints per error site, not adding the mechanism. |

## P2 — 1.2: advanced capabilities

| Item | Status | Notes |
| --- | --- | --- |
| Multi-remote & remote strategy | ✅ | `remote.fetch`/`remote.push` arrays, `baseOverrides`, `typeOverrides`, and per-branch-type `pushRemote` are all implemented — see [RFC-0001](./rfcs/0001-multi-remote.md) (status updated) and the [workflow definition reference](../guides/workflow-definition.md#remote-configuration). |
| New finish strategies (`cherry-pick`, `rebase-merge`) | ⬜ | `MergeStrategy` is still `"merge" \| "squash" \| "rebase"` only — see [RFC-0002](./rfcs/0002-finish-strategies.md). |
| `track` / `rename` commands | ✅ | Both fully implemented and wired in `program.ts` — see [commands.md](../guides/commands.md#gitwe-track-branch-or-type-name). (Older planning notes described these as unwired leftover files; that's no longer accurate.) |
| `allowdirty` workflow option | ⬜ | Not present on `WorkflowConfig`. |
| `integrate` command for base branches | ⬜ | No such command exists. |
| Push-option passthrough (`-o`) on `publish` | ⬜ | `PushOptions` covers `force`/`forceWithLease`/`setUpstream`/`followTags` only. |
| Changelog generation | 🟡 | A `changelog: { enabled, config? }` field exists on the workflow definition and is prompted for in the `init` wizard, but there's no generator behind it yet. |
| Prerelease handling | 🟡 | `versioning.prerelease` (`{ enabled, format, types }`) is part of the schema; how thoroughly it's exercised by `VersionCalculatorService` is worth a dedicated test pass. |

## P3 — 1.3 and beyond: integration

| Item | Status |
| --- | --- |
| GitHub Action rebuilt on the fixed `action.yaml` (P0 above), with matrix examples | ⬜ |
| Basic VS Code extension (start/finish/overview/doctor) | ⬜ |
| Path-based / subdirectory workflow support for monorepos | ⬜ |
| JSON Schema for the workflow definition published to the Schema Store | ⬜ |
| Reusable workflow other repositories can call | ⬜ |

## 2.0 and later: extensibility

Deliberately not started yet — noted here so the direction is visible:

- Structured hook I/O is already partly here (`stdin: true` hooks get JSON
  context and can block an operation by returning `{ "continue": false }` —
  see [hooks.md](../guides/hooks.md#blocking-an-operation)); a fuller
  exit-code contract is still open.
- Lightweight "strategy scripts" (a script that receives context and returns
  the git operations to run) — not started.
- Explicit non-goal: a general-purpose plugin loader or extension
  marketplace.

## Guiding principles

1. Workflow rules live in data, not hard-coded `if`/`else`.
2. Clean Architecture — domain and application never import infrastructure
   or CLI.
3. Resumability — long-running operations (especially `finish`) must be
   continuable and abortable.
4. Safety first — never delete or rewrite history without an explicit flag;
   prefer fail-fast over silent data loss.
5. Simplicity over features — every new capability must justify its added
   cognitive load, including parity items borrowed from git-flow /
   gitflow-avh / git-flow-next: match their *outcome*, not necessarily their
   exact flag or subcommand shape, when gitwe's flatter, config-driven
   design already gets there differently.

## Completed

| Version | Highlights |
| --- | --- |
| 1.0.0 | First stable release — Clean Architecture rewrite, `classic`/`github`/`gitlab` presets, resumable `finish`, hooks, `doctor`, machine-readable output |

## How this document evolves

- Breaking changes or large design shifts get an RFC under
  [`docs/development/rfcs/`](./rfcs/README.md).
- When a P0/P1/P2/P3 item ships, move its row into "Completed" (or the
  [changelog](../../CHANGELOG.md)) instead of just marking it ✅ in place.
