# Architecture

gitwe follows **Clean Architecture**. Dependencies point **inward** only.

```
cli  →  di  →  infrastructure  →  application  →  domain
                      ↘________________↗
```

`domain` and `application` never import `infrastructure`, `di`, or `cli`.

## Layers

### `src/domain` — business rules

Pure TypeScript. No filesystem, no process spawning, no Commander.

| Module | Role |
|--------|------|
| `entities.ts` | `WorkflowConfig`, `BaseBranch`, `TopicType`, `ResolvedTopic`, … |
| `errors.ts` | `GitweError` hierarchy (`ConfigError`, `ConflictError`, …) |
| `branchName.ts` | Git ref-format checks, shell glob → `RegExp` |
| `workflow.ts` | Read-only lookups over a definition |
| `config/parse.ts` | Parse + validate (parents, cycles, shared prefixes) |
| `config/editor.ts` | Pure add/edit/rename/delete that always re-validate |
| `config/presets.ts` | `classic` / `github` / `gitlab` factories |
| `index.ts` | Barrel export for the domain layer |

### `src/application` — use cases

Orchestrates domain rules through **interfaces** (ports). Still no I/O.

| Module | Role |
|--------|------|
| `interfaces/*` | Ports: `GitRepository`, `Logger`, `HookRunner`, `OperationStateStore` |
| `Engine.ts` | `start` / `finish` / `update` / `publish` / … |
| `use-case/finish.ts` | Resumable finish state machine (`--continue` / `--abort`) |
| `context.ts` | `EngineContext` + message placeholder expansion (`%b`, `%p`, …) |

### `src/infrastructure` — adapters

Implements the ports with real I/O.

| Module | Role |
|--------|------|
| `git/ShellGitRepository.ts` | Drives the `git` binary |
| `git/ProcessRunner.ts` | `spawn` helper |
| `config/loader.ts` | Find / read / write JSON or YAML definitions |
| `state/FileOperationStateStore.ts` | `.git/gitwe/operation.json` |
| `hooks/FileHookRunner.ts` | Scripts under `.gitwe/hooks/` |
| `logger/consoleLogger.ts` | Stdout / stderr logger |

### `src/di` — composition root

| Module | Role |
|--------|------|
| `createEngine.ts` | Wires adapters into `Engine` |
| `container.ts` | Re-exports wiring helpers for tests / advanced use |

### `src/cli` — delivery

Commander commands, coloured output, exit codes. No workflow rules.

| Module | Role |
|--------|------|
| `args.ts` | Pre-scan global flags from raw argv |
| `options.ts` | `GlobalOptions` + shared Commander flag descriptors |
| `error-reporter.ts` | Map domain errors → stderr + exit codes |
| `program.ts` | Build and run the Commander tree |
| `commands/*` | `init`, `config`, `overview`, topic groups |
| `output.ts` | Colours, trees, success messages |

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (`GitweError` or unexpected) |
| `2` | Merge/rebase conflict (resume with `--continue` or `--abort`) |

## Library entry

```ts
import { Engine, createEngine, createPreset } from "gitwe";

const engine = await createEngine({
  root: process.cwd(),
  config: createPreset("classic"),
});

await engine.start("feature", "login");
await engine.finish(engine.resolve("feature", "login"));
```

Prefer `createEngine(...)` unless you need a custom `GitRepository` adapter.

## PR checklist

- [ ] `domain` has exactly one of each concept (no duplicate types/classes)
- [ ] `domain` and `application` do not import `infrastructure`, `di`, or `cli`
- [ ] New git behaviour goes behind `GitRepository`
- [ ] New operations live in `application` (`Engine` or `use-case/`)
- [ ] CLI only formats results and parses argv
