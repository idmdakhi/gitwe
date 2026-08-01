# Architecture

gitwe follows **Clean Architecture**. Dependencies point inward only.

```
cli  →  infrastructure  →  application  →  domain
                ↘______________↗
```

`domain` and `application` never import `infrastructure` or `cli`.

## Layers

### `src/domain` — enterprise / business rules

Pure TypeScript. No I/O, no Node APIs beyond language primitives.

| Module | Responsibility |
|--------|----------------|
| `types.ts` | `WorkflowConfig`, `BaseBranch`, `TopicType`, `ResolvedTopic`, … |
| `errors.ts` | Domain error hierarchy (`GitweError`, `ConfigError`, …) |
| `branchName.ts` | Git ref-format validation, glob → RegExp |
| `workflow.ts` | Read-only lookups over a workflow definition |
| `config/parse.ts` | Parse + validate a definition (strict parents, cycles, prefixes) |
| `config/edit.ts` | Pure add/edit/rename/delete that always re-validate |
| `config/presets.ts` | Factories for `classic` / `github` / `gitlab` |

### `src/application` — use cases

Orchestrates domain rules through **ports** (interfaces). Still no filesystem or process spawning.

| Module | Responsibility |
|--------|----------------|
| `ports/GitRepository.ts` | Git operations the engine needs |
| `ports/Logger.ts` | Logging port + `silentLogger` |
| `ports/HookRunner.ts` | Lifecycle hook port |
| `ports/OperationState.ts` | Resumable finish state port |
| `Engine.ts` | `start` / `finish` / `update` / `publish` / … |
| `operations/finish.ts` | Finish state machine (`--continue` / `--abort`) |
| `context.ts` | `EngineContext` + message placeholder expansion |

### `src/infrastructure` — adapters

Implements ports with real I/O.

| Module | Responsibility |
|--------|----------------|
| `git/ShellGitRepository.ts` | `git` binary via `ProcessRunner` |
| `git/ProcessRunner.ts` | `spawn` wrapper |
| `config/loader.ts` | Find / read / write JSON or YAML definitions |
| `state/OperationStateStore.ts` | `.git/gitwe/operation.json` |
| `hooks/HookRunner.ts` | Execute scripts under `.gitwe/hooks/` |
| `logger/consoleLogger.ts` | Stdout/stderr logger |
| `createEngine.ts` | **Composition root** — wires adapters into `Engine` |

### `src/cli` — delivery mechanism

Commander commands, coloured output, exit codes. Calls `createEngine` / loaders; never contains workflow rules.

## Dependency rule checklist (PR template)

- [ ] `domain` has exactly one of each concept (no duplicate types/classes)
- [ ] `domain` and `application` do not import `infrastructure` or `cli`
- [ ] New git behaviour goes behind `GitRepository` (infrastructure adapter)
- [ ] New use cases live in `application` (or `operations/`)
- [ ] CLI only formats results and parses argv

## Library entry

`src/index.ts` re-exports public API from all layers so consumers can use:

```ts
import { Engine, createEngine, createPreset } from "gitwe";
```

Prefer `createEngine(...)` (composition root) over constructing `Engine` with manual adapters unless you need a custom `GitRepository`.
