# Architecture

gitwe is built as four concentric layers (Clean Architecture / Ports &
Adapters). Dependencies only ever point **inward**:

```
cli  →  application  →  domain
infrastructure  →  domain (implements domain ports)
```

`domain` never imports `application`, `infrastructure` or `cli`.
`application` never imports `infrastructure` or `cli`. This is enforced by
convention and reviewed in PRs (see
[coding-style.md](../development/coding-style.md)); there is no automated
lint rule for it yet — see the [roadmap](../development/roadmap.md).

See [project-structure.md](./project-structure.md) for the annotated file
tree; this page focuses on what each layer is responsible for and why.

## Domain

Pure TypeScript, no `fs`, no `child_process`, no `console`. Everything here
is covered by fast unit tests with zero setup.

- **Entities** — `BaseBranch`, `BranchType`, `WorkflowConfig`, plus
  `RemoteConfig`, `VersioningConfig`, `HookConfig`: the shape of a workflow
  definition once loaded and validated.
- **Value objects** — `BranchName`: validates and normalises a branch name
  (rejects whitespace, `~^:?*[\`, consecutive dots/slashes, a leading or
  trailing slash, `.lock` suffixes, and more).
- **Services**
  - `WorkflowService` — the workflow definition wrapped with query helpers:
    root branch, branch-type resolution by name/alias, squash eligibility,
    tag/version-bump rules, remote resolution with type/base overrides.
  - `ConfigValidatorService` — rejects invalid definitions: missing/duplicate
    root branches, cycles in the base-branch tree, duplicate branch-type
    names or prefixes, dangling `base`/`target`/remote-override references.
  - `ConfigEditorService` — the domain logic behind `gitwe config
    add|edit|rename|delete`: mutates a `WorkflowConfig` immutably and
    re-validates the result before it's saved.
  - `VersionCalculatorService` — semver parsing, bumping and formatting for
    the tagging step of `finish`.
- **Ports** — interfaces that `infrastructure` implements and `application`
  depends on, never the other way round: `GitRepository`, `ConfigRepository`,
  `HookRunner`, `Logger`, `OperationStateStore`.
- **Errors** — every failure is a `GitweError` subclass with a stable `code`
  (`CONFIG`, `VALIDATION`, `CONFLICT`, `NOT_INITIALIZED`,
  `OPERATION_IN_PROGRESS`, `GIT`, `HOOK_FAILED`, `HOOK_BLOCKED`) and an
  optional user-facing `hint`. The CLI's `action()` wrapper
  (`src/cli/commands/shared.ts`) is the only place that turns a `GitweError`
  into an exit code or a JSON/YAML error envelope — `2` for `CONFLICT`, `1`
  for everything else.

## Application

One use-case class per multi-step operation that benefits from an isolated,
fake-driven test: `InitWorkflowUseCase`, `StartBranchUseCase`,
`FinishBranchUseCase`, `UpdateBranchUseCase`, `PublishBranchUseCase`,
`DeleteBranchUseCase`, `ListBranchesUseCase`, `OverviewUseCase`,
`ValidateWorkflowUseCase`, `TrackBranchUseCase`. Each depends only on
`WorkflowService` and domain ports — never on a concrete adapter — which is
what makes them testable with in-memory fakes (see
[testing.md](../development/testing.md)).

Simpler operations (`checkout`, `clean`, `pull`, `rename`, `tag`, `graph`,
`runGit`, and the `config add|edit|rename|delete|list` group) are implemented
directly as methods on `Engine` rather than as separate use-case classes,
since they're a single git/config call plus a hook or two — a dedicated class
would just be indirection. `Engine` (`src/application/engine.ts`) is the
public facade both the CLI and library consumers talk to.
`Engine.create(deps)` loads the workflow definition through `ConfigRepository`
and throws `NotInitializedError` if none is found; `Engine.init(deps,
options)` writes one instead (preset or explicit config, with optional base
branch creation). Nothing outside `application/` imports a use case directly.

### The resumable `finish` operation

`finish` is the one operation modelled as an explicit state machine
(`FinishBranchUseCase`): merge into each target → tag → push → delete. If a
merge conflict stops it partway through, progress is persisted via
`OperationStateStore` (`.git/gitwe/operation.json`) so a **separate process** can
resume it with `gitwe finish --continue`, or cancel it with
`gitwe finish --abort` / `gitwe abort`.
`tests/application/finish-branch.use-case.test.ts` exercises every branch of
this state machine with an in-memory fake — no real git repository needed.

## Infrastructure

The only layer allowed to import `node:fs`, `node:child_process`, or
`js-yaml`.

- `ShellGitRepository` (`infrastructure/git/`) — the single place that shells
  out to `git`; implements `GitRepository`.
- `YamlConfigRepository` (`infrastructure/config/`) — loads/saves
  `gitwe.yaml`/`gitwe.json` (see the file-discovery order in the
  [workflow definition reference](../guides/workflow-definition.md)) and
  exposes the built-in `classic`/`github`/`gitlab` presets from
  `domain/config/presets.ts`.
- `VersionConfigLoader`, `RemoteConfigLoader`, `HookConfigLoader`
  (`infrastructure/config/`) — merge an optional external file (`versioning
  .config`, `remote.config`, `hooks.config`) over the inline section of the
  same name.
- `FileHookRunner` (`infrastructure/hooks/`) — runs hooks from
  `typeOverrides` → `advanced` → `inline` → filesystem scripts under
  `hooks.path`; see the [hooks guide](../guides/hooks.md).
- `ConsoleLogger` (`infrastructure/logger/`) — the default `Logger`.
- `FileOperationStateStore` (`infrastructure/state/`) — reads/writes
  `.git/gitwe/operation.json` for resumable operations.

Swap any of these for a fake or a different backend without touching a
single use case — that's the point of the port/adapter split.

## CLI

Commander wiring, flag parsing and console output live here and nowhere
else. `src/cli/program.ts` is the single source of truth for which commands
the `gitwe` binary exposes — see the
[command reference](../guides/commands.md) for the full, current list.

- `cli/container.ts` is the composition root — the one place adapters get
  wired together into an `EngineDeps`.
- `cli/commands/shared.ts` provides `loadEngine()` (builds an `Engine` from
  the root command's global flags) and the `action()` wrapper that turns
  thrown `GitweError`s into either clean text output or an RFC-0004
  JSON/YAML envelope, and sets the right exit code.
- `cli/output.ts` implements `CommandOutput` and the `{ schemaVersion: 1,
  command, ok, data, warnings, error }` envelope described in
  [RFC-0004](../development/rfcs/0004-machine-readable-output.md); every
  command reads/writes through it via `out.ok(...)`/`out.fail(...)`, so
  `--format json|yaml` behaves consistently everywhere without individual
  commands branching on format.

## Why layers, concretely

- Want to test merge-strategy or version-bump logic? Write a domain unit
  test. No git repository, no filesystem, milliseconds to run.
- Want to test a whole operation (e.g. "finish leaves a resumable state on
  conflict")? Write an application test against an in-memory `GitRepository`
  fake — see `tests/application/finish-branch.use-case.test.ts`.
- Want to change how gitwe talks to git, or support a second VCS? Only
  `infrastructure/git/` changes.
- Want a new flag or a different terminal output format? Only `cli/`
  changes.

## See also

- [Project structure](./project-structure.md)
- [Command reference](../guides/commands.md)
- [Coding style](../development/coding-style.md)
- [Testing](../development/testing.md)
- [Contributing](../development/contributing.md)
- [Roadmap](../development/roadmap.md)
