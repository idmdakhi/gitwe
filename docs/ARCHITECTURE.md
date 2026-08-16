# Architecture

gitwe is built as four concentric layers (Clean Architecture / Ports & Adapters).
Dependencies only ever point **inward**:

```
cli  →  application  →  domain
infrastructure  →  domain (implements domain ports)
```

`domain` never imports `application`, `infrastructure` or `cli`. `application`
never imports `infrastructure` or `cli`. This is enforced by convention and
reviewed in PRs (see [coding-style.md](./development/coding-style.md)); there is
no lint rule for it yet — see [ROADMAP](./development/ROADMAP.md).

```
src/
├── domain/            # pure business rules — zero I/O
│   ├── entities/       # BaseBranch, BranchType, WorkflowConfig
│   ├── value-objects/  # BranchName
│   ├── ports/           # interfaces infrastructure must implement
│   ├── services/         # WorkflowService, ConfigValidatorService, VersionCalculatorService
│   └── errors/            # GitweError hierarchy
│
├── application/        # orchestration, no direct I/O
│   ├── use-cases/        # one class per operation (Start/Finish/Update/...)
│   └── engine.ts          # Engine — the public facade over every use case
│
├── infrastructure/     # adapters — the only place that touches the outside world
│   ├── git/              # ShellGitRepository (shells out to `git`)
│   ├── config/            # YamlConfigRepository, built-in presets
│   ├── hooks/              # FileHookRunner
│   ├── logger/              # ConsoleLogger
│   └── state/                # FileOperationStateStore (.gitwe/state.json)
│
├── cli/                # presentation only — Commander wiring, argv, console output
│   ├── commands/          # one file per CLI command
│   ├── container.ts        # composition root: wires adapters into EngineDeps
│   ├── options.ts            # shared --format/--json option types (see note below)
│   ├── output.ts              # colour helpers, tree renderer, JSON/YAML envelope
│   └── program.ts              # builds and runs the Commander program
│
└── index.ts             # library entry point — `import { Engine } from "gitwe"`
```

## Domain

Pure TypeScript, no `fs`, no `child_process`, no `console`. Everything here is
covered by fast unit tests with zero setup.

- **Entities** — `BaseBranch`, `BranchType`, `WorkflowConfig`: the shape of a
  workflow definition once loaded and validated.
- **Value objects** — `BranchName`: parses a full branch name into
  `{ type, shortName }` against the configured prefixes.
- **Services**
  - `WorkflowService` — the workflow definition wrapped with query helpers:
    root branch, branch-type resolution by name/alias, squash eligibility,
    tag/version-bump rules.
  - `ConfigValidatorService` — rejects invalid definitions: missing/duplicate
    root branches, cycles in the base-branch tree, duplicate branch-type names
    or prefixes, and dangling `base`/`target` references.
  - `VersionCalculatorService` — semver parsing, bumping and formatting for the
    tagging step of `finish`.
- **Ports** — interfaces that `infrastructure` implements and `application`
  depends on, never the other way round: `GitRepository`, `ConfigRepository`,
  `HookRunner`, `Logger`, `OperationStateStore`.
- **Errors** — every failure is a `GitweError` subclass with a stable `code`
  (`CONFIG`, `VALIDATION`, `CONFLICT`, `NOT_INITIALIZED`,
  `OPERATION_IN_PROGRESS`, `GIT`) and an optional user-facing `hint`. The CLI's
  `action()` wrapper (`src/cli/commands/shared.ts`) is the only place that
  turns a `GitweError` into an exit code — `2` for `CONFLICT`, `1` for
  everything else.

## Application

One use case per operation
(`InitWorkflowUseCase`, `StartBranchUseCase`, `FinishBranchUseCase`,
`UpdateBranchUseCase`, `PublishBranchUseCase`, `DeleteBranchUseCase`,
`ListBranchesUseCase`, `OverviewUseCase`, `ValidateWorkflowUseCase`). Each one
depends only on `WorkflowService` and domain ports — never on a concrete
adapter — which is what makes them testable with in-memory fakes (see
[testing.md](./development/testing.md)).

`Engine` (`src/application/engine.ts`) is the public facade both the CLI and
library consumers talk to. `Engine.create(deps)` loads the workflow definition
through `ConfigRepository` and throws `NotInitializedError` if none is found;
`Engine.init(deps, preset, force)` writes one instead. Nothing outside
`application/` imports a use case directly.

### The resumable `finish` operation

`finish` is the one operation modeled as an explicit state machine
(`FinishBranchUseCase`): merge into each target → tag → push → delete. If a
merge conflict stops it partway through, progress is persisted via
`OperationStateStore` (`.gitwe/state.json`) so a **separate process** can
resume it with `gitwe finish --continue`, or cancel it with
`gitwe finish --abort`. `tests/application/finish-branch.use-case.test.ts`
exercises every branch of this state machine with an in-memory fake — no real
git repository needed.

## Infrastructure

The only layer allowed to import `node:fs`, `node:child_process`, or `js-yaml`.

- `ShellGitRepository` (`infrastructure/git/`) — the single place that shells
  out to `git`; implements `GitRepository`.
- `YamlConfigRepository` (`infrastructure/config/`) — loads/saves
  `gitwe.yaml`/`gitwe.json` and exposes the built-in `classic`/`github`/`gitlab`
  presets from `presets.ts`.
- `FileHookRunner` (`infrastructure/hooks/`) — runs scripts under
  `.gitwe/hooks/<hook-name>` if present.
- `ConsoleLogger` (`infrastructure/logger/`) — the default `Logger`.
- `FileOperationStateStore` (`infrastructure/state/`) — reads/writes
  `.gitwe/state.json` for resumable operations.

Swap any of these for a fake or a different backend without touching a single
use case — that's the point of the port/adapter split.

## CLI

Commander wiring, flag parsing and `console.log`/`console.error` formatting
live here and nowhere else.

- `cli/container.ts` is the composition root — the one place adapters get
  wired together into an `EngineDeps`.
- `cli/commands/shared.ts` provides `loadEngine()` (builds an `Engine` from the
  root command's global flags) and the `action()` wrapper that turns thrown
  `GitweError`s into clean, exit-coded CLI output.
- `cli/program.ts` builds the actual `Command` tree. **Only the commands
  registered there are reachable from the `gitwe` binary** — see
  [commands.md](./commands.md) for exactly which ones that is today, and the
  note at the top of that file about files under `cli/commands/` that exist on
  disk but are not yet wired into the program.
- `cli/options.ts` / `cli/output.ts` contain the shared `--format`/JSON-YAML
  envelope machinery described in
  [RFC-0004](./development/rfcs/0004-machine-readable-output.md). This is
  scaffolding for the roadmap item *"make `--format` available on every major
  command"* — as of today no command in `cli/program.ts` calls into it, so
  `--format`/`--json` do not yet change any command's output. Don't rely on it
  until it's listed as available in [commands.md](./commands.md).

## Why layers, concretely

- Want to test merge-strategy or version-bump logic? Write a domain unit test.
  No git repository, no filesystem, milliseconds to run.
- Want to test a whole operation (e.g. "finish leaves a resumable state on
  conflict")? Write an application test against an in-memory `GitRepository`
  fake — see `tests/application/finish-branch.use-case.test.ts`.
- Want to change how gitwe talks to git, or support a second VCS? Only
  `infrastructure/git/` changes.
- Want a new flag or a different terminal output format? Only `cli/` changes.

## See also

- [Command reference](./commands.md)
- [Coding style](./development/coding-style.md)
- [Testing](./development/testing.md)
- [Contributing](./development/contributing.md)
- [Roadmap](./development/ROADMAP.md)
