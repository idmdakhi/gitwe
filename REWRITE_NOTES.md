# v2: architectural rewrite

This is a full rewrite on top of Clean Architecture / DDD, not a patch on
top of the previous structure. It replaces the single ~150-line
`WorkflowEngine` god-class and the flat `core/`, `git/`, `logging/` folders
with four layers that only depend inward:

```
cli  →  application  →  domain
              ↑
       infrastructure
```

`domain` depends on nothing else in this codebase. `application` depends
only on `domain`. `infrastructure` implements `domain`'s ports. `cli`
composes everything at one place (`cli/container.ts`) and nowhere else
imports a concrete infrastructure class.

## What each layer contains

**`domain/`** — the rules of a git workflow, independent of git itself:
- `aggregates/Workflow.ts` — the aggregate root; owns every naming/uniqueness
  invariant a branching strategy must satisfy
- `valueObjects/` — `BranchName`, `BranchTypeRule`, `MergeOutcome`,
  `CommitInfo`, `RemoteConfig`
- `entities/Branch.ts`
- `policies/AutoTagPolicy.ts` — the "how do I name a release tag" rule,
  isolated and independently testable
- `rules/` + `services/RuleEvaluator.ts` — the Specification pattern:
  `BranchDoesNotExistRule`, `BaseBranchExistsRule`, `WorkingTreeCleanRule`,
  each independently testable, and an evaluator that actually calls them
  (previous versions built a `RuleEngine` that was constructed and never
  invoked — see "bugs fixed" below)
- `hooks/HookDefinition.ts`, `HookPhase.ts`
- `events/` — `BranchStartedEvent`, `BranchFinishedEvent`
- `ports/` — `GitRepository`, `HookRunner`, `EventBus`: the interfaces
  everything else depends on instead of concrete implementations
- `errors/` — one error base class, one hierarchy, used everywhere

**`application/`** — use-case orchestration, no I/O of its own:
- `commands/`, `queries/` — intent objects (`StartBranchCommand`,
  `FinishBranchCommand`, `GetStatusQuery`, `ListBranchesQuery`)
- `services/` — `BranchService`, `MergeService`, `TagService`,
  `HookService`, `RemoteService`, `StatusService`: each one focused
  responsibility, 20–50 lines
- `handlers/` — `StartBranchHandler`, `FinishBranchHandler`,
  `ListBranchesHandler`, `GetStatusHandler`, `ValidateWorkflowHandler`,
  `DoctorHandler`: pure sequencing of services, no business logic of
  their own
- `dto/` — the shapes handlers return
- `ports/WorkflowConfigReader.ts` — so `ValidateWorkflowHandler` depends on
  an interface, not directly on the file-reading `WorkflowConfigLoader`

No class in `domain/` or `application/` is over 130 lines; most are under 50.

**`infrastructure/`** — the only place that touches the filesystem, a shell,
or `child_process`:
- `git/ShellGitRepository.ts` — the single implementation of `GitRepository`
- `hooks/ShellHookRunner.ts` — implements `HookRunner`
- `events/InMemoryEventBus.ts` — implements `EventBus`
- `logging/ConsoleLogger.ts`, `NoopLogger.ts` — implement the shared
  `Logger` port
- `config/WorkflowConfigLoader.ts` — the single config loader (JSON + YAML)
- `config/BuiltInWorkflows.ts` — git-flow, GitHub Flow, and trunk-based as
  plain `Workflow` instances, to make the "gitwe is a platform, not just
  git-flow" idea concrete rather than aspirational

**`cli/`** — one file per command (`start`, `finish`, `status`, `graph`,
`current`, `list`, `types`, `validate`, `doctor`, `config`), each 15–40
lines: parse args, call one handler, format output. `container.ts` is the
only file that imports from `infrastructure/` — the composition root.

## Bugs fixed along the way

- **Rules were dead code.** The old `RuleEngine` was constructed in
  `WorkflowEngine`'s constructor but `.validate()` was never called from
  `start()` or `finish()`. The new `RuleEvaluator` is actually invoked by
  both `StartBranchHandler` and `FinishBranchHandler`.
- **`js-yaml@^5.2.1` doesn't exist** in `package.json` (js-yaml's latest
  major is 4.x) — pinned to `^4.1.0` to match the already-correct
  `@types/js-yaml@^4.0.9`.
- **Missing root `tsconfig.json`.** `npm run typecheck` ran `tsc --noEmit`
  with no config to find (only `tsconfig.build.json` existed, which
  excludes `tests/`). Added a root config that covers both `src` and
  `tests`, with `tsconfig.build.json` extending it for emit-specific
  settings.
- Preserved the fast-forward-detection, `getBranchParent`, and
  triple-push fixes from the previous pass (see `REFACTOR_NOTES.md` in the
  earlier version) — the same underlying git logic now lives in
  `ShellGitRepository` instead of `ShellGitAdapter`.

## What's genuinely new versus the previous version

- **`RuleEvaluator` is wired in and enforced.** Starting a branch now
  actually checks the base branch exists and the target doesn't already
  exist via rules (previously enforced ad hoc, inline, in the engine).
  Finishing now refuses with a dirty working tree.
- **`doctor` and `config` commands** — health checks and a way to see the
  resolved workflow config, matching your requested command list.
- **`graph` and `status` are separate, both backed by `StatusService`** —
  `status` gives a summary, `graph` prints the ASCII branch tree.
- **Three built-in workflows** (`git-flow`, `github-flow`, `trunk-based`)
  selectable via `--workflow`, plus `--config` for a fully custom one —
  demonstrating the pluggable-workflow idea end to end, not just in
  documentation.
- **Domain events** (`BranchStartedEvent`, `BranchFinishedEvent`) published
  through `EventBus` on every start/finish — the event-driven piece from
  your proposed architecture, kept intentionally small (in-process,
  synchronous) rather than over-built for a short-lived CLI process.

## What I did not build (and why)

- **No `infrastructure/persistence/`.** There's nothing for `gitwe` to
  persist — no user accounts, no saved runs, nothing that outlives a
  single command invocation. Adding an empty persistence layer would have
  reproduced exactly the "stub classes with no real implementation"
  problem you originally flagged. If a use case emerges (e.g. caching
  branch-parent lookups across commands), the `application` layer already
  has a place to define that port.
- **No libgit2 or GitHub API implementation of `GitRepository`.** The port
  is designed to make this a drop-in addition later, but building one
  without a concrete need would be speculative, untested code.
- **CQRS is "lite."** Commands/queries are plain intent objects and
  handlers call services directly — there's no command bus, middleware
  pipeline, or query caching. Those add real value at a scale (many
  handlers, cross-cutting concerns like auth/caching) this project isn't
  at yet; the DTOs are shaped so a bus could be dropped in later without
  changing handler signatures.

## Tests

- `tests/domain/` — `Workflow` invariants, all three rules + `RuleEvaluator`
- `tests/application/` — `StartBranchHandler`, `FinishBranchHandler`
  (multi-target merges, tagging, the single-push-not-triple-push fix,
  dirty-tree rejection), against an `InMemoryGitRepository` test double
  that fully implements the `GitRepository` port
- `tests/infrastructure/` — `ShellGitRepository` against a real temp git
  repo, including a real fast-forward-detection assertion (not just the
  `--no-ff` case the old tests covered)

`ListBranchesHandler`, `GetStatusHandler`, `ValidateWorkflowHandler`, and
`DoctorHandler` are thin enough (each delegates to one already-tested
service) that I didn't add a dedicated test file for each — the services
underneath them (`StatusService`, `WorkflowConfigLoader`) are the parts
worth testing in isolation, and `StatusService`/`WorkflowConfigLoader`
would be reasonable next additions if you want that layer covered too.
