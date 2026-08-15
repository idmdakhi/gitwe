# gitwe

A configurable git branching-workflow engine. Define your branching model once
in `.gitwe/gitwe.yaml`, and let `gitwe` run `start` / `finish` / `update` /
`publish` / `delete` against it.

```bash
npm install
npm run build
node dist/cli/program.js init --preset classic
node dist/cli/program.js start feature login
node dist/cli/program.js finish
```

## Why this rewrite

This is a from-scratch rewrite of the original project on a **clean,
layered architecture**. The goals:

- **`domain` has zero I/O.** No `fs`, no `child_process`, no `console`. Every
  business rule (branch resolution, merge-strategy selection, semver bumping,
  config validation, cycle detection) is a plain function/class you can unit
  test in milliseconds, with no git repository required.
- **`application` orchestrates, it doesn't implement.** Each operation is one
  use case (`StartBranchUseCase`, `FinishBranchUseCase`, ...) that depends only
  on domain services and *ports* (interfaces) — never on a concrete adapter.
- **`infrastructure` is swappable.** `ShellGitRepository` is the only place
  that shells out to `git`. Swap it for a fake in tests, or for a different
  VCS backend entirely, without touching a single use case.
- **`cli` is presentation only.** Commander wiring, flag parsing, and
  `console.log` formatting live here and nowhere else. The composition root
  (`cli/container.ts`) is the one place adapters get wired together.

```
src/
├── domain/            # entities, value objects, domain services, ports (pure)
├── application/        # use cases + the Engine facade that composes them
├── infrastructure/     # ShellGitRepository, YAML config, hooks, logger, state
├── cli/                 # Commander program, one file per command
├── index.ts             # library entry point (import { Engine } from "gitwe")
└── version.ts
```

### The resumable `finish` operation

`finish` is modeled as an explicit state machine
(`FinishBranchUseCase`): merge into each target → tag → push → delete.
If a merge conflict stops it partway through, progress is persisted via
`OperationStateStore` (`.gitwe/state.json`) so a **separate process** can
resume it with `gitwe finish --continue`, or cancel it with
`gitwe finish --abort` — this is exercised directly in
`tests/application/finish-branch.use-case.test.ts` using an in-memory fake,
no real git repository needed.

## Workflow definition — `.gitwe/gitwe.yaml`

```yaml
version: 1
name: classic

baseBranches:
  - name: main
    aliases: [master]
    protected: true
  - name: develop
    base: main
    protected: true

branchTypes:
  - name: feature
    base: develop
    target: [develop]
    prefix: feature/
  - name: release
    base: develop
    target: [main, develop]
    prefix: release/
  - name: hotfix
    base: main
    target: [main, develop]
    prefix: hotfix/

merge:
  strategy: merge
  deleteOnFinish: [feature, release, hotfix]
  squash: { enabled: true, default: false, branchTypes: [feature] }

versioning:
  enabled: true
  tagPrefix: v
  tag: [release, hotfix]
  bumpRules: { minor: [release], patch: [hotfix] }

remote:
  name: origin
  autoFetch: true
  fetch: [origin]
  push: [origin]
```

`ConfigValidatorService` rejects invalid definitions before any git command
runs: missing/duplicate root branches, cycles in the base-branch tree,
duplicate branch-type names or prefixes, and dangling `base`/`target`
references.

Three presets ship out of the box — `classic` (git-flow), `github`
(trunk-based), `gitlab` (main → staging → production) — see
`src/infrastructure/config/presets.ts`.

## CLI reference

| Command | Purpose |
|---|---|
| `gitwe init [--preset classic\|github\|gitlab] [--force]` | write a workflow definition + create missing base branches |
| `gitwe start <type> <name> [base] [--fetch]` | create a topic branch |
| `gitwe finish [name] [--squash] [--push] [--current-version <semver>]` | merge into every target, tag, push, delete |
| `gitwe finish --continue` / `--abort` | resume or cancel a conflicted finish |
| `gitwe update <name> [--rebase] [--fetch]` | sync a topic branch with its base |
| `gitwe publish <name> [--force]` | push + set upstream |
| `gitwe delete <name> [-f] [-r]` | delete local (and optionally remote) branch |
| `gitwe list [type] [pattern]` | list topic branches |
| `gitwe overview` (alias `status`) | workflow summary + branch counts |
| `gitwe validate` | validate the workflow definition |

Global flags: `--cwd <path>`, `--config <path>`, `--no-color`, `-v/--verbose`.

## Library usage

```ts
import { Engine, YamlConfigRepository, ShellGitRepository,
         FileHookRunner, FileOperationStateStore, ConsoleLogger } from "gitwe";

const root = process.cwd();
const engine = await Engine.create({
  configRepo: new YamlConfigRepository(root),
  git: new ShellGitRepository(root),
  hooks: new FileHookRunner(root, ".gitwe/hooks", true),
  stateStore: new FileOperationStateStore(root),
  logger: new ConsoleLogger(),
});

await engine.start("feature", "login");
await engine.finish("feature/login", { squash: true });
```

## Development

```bash
npm install
npm run typecheck   # strict TypeScript, no emit
npm test            # vitest — 18 tests, domain + application layers
npm run build        # emits dist/
```

## Scope note

This rewrite prioritises the core engine (start/finish/update/publish/delete/
list/overview/validate) with full test coverage of the domain layer and the
resumable finish state machine. Not reimplemented from the original: the
`doctor` auto-repair command, multi-remote push fan-out, changelog
generation, and machine-readable (`--format json|yaml|table`) output — the
architecture (ports in `domain`, adapters in `infrastructure`) is built so
each can be added as a new use case + adapter without touching existing code.
