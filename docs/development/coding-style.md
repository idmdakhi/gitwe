# Coding style

## TypeScript

- **ESM only** (`"type": "module"`). Import paths end with `.js` even when
  importing a `.ts` source (`import { Engine } from "./engine.js"`).
- **Strict mode** is on. Prefer explicit types on public APIs; let inference
  work inside function bodies.
- Prefer `interface` for object shapes that may be extended; `type` for
  unions and mapped types.
- No default exports in library code — named exports keep refactors safer.

## Layer rules

- Pure validation and branch-tree rules go in **domain**
  (`src/domain/`) — no `fs`, `child_process`, or `console`.
- Orchestration that talks to domain ports goes in **application**
  (`src/application/`).
- `fs`/`child_process`/path I/O goes in **infrastructure**
  (`src/infrastructure/`).
- `argv` parsing and coloured/JSON output go in **cli** (`src/cli/`).

Never import outward:

```
domain       ↛ application | infrastructure | cli
application  ↛ infrastructure | cli
```

`infrastructure` and `cli` may both depend on `domain` and `application`.
See the [architecture overview](../architecture/overview.md) for what lives
in each layer today.

## Naming

- One concept, one name. Don't add a second class that means the same thing
  as an existing domain type.
- Infrastructure adapters that use the filesystem are prefixed `File*`
  (`FileHookRunner`, `FileOperationStateStore`); the git adapter is
  `ShellGitRepository` since it shells out to the `git` binary.
- Use cases that implement a multi-step operation live under
  `src/application/use-cases/`, one file per use case, named
  `<verb>-<noun>.use-case.ts`. Simpler, single-step operations are methods on
  `Engine` directly rather than a dedicated use-case class — see
  ["Application"](../architecture/overview.md#application) for the
  reasoning.

## Errors

Throw subclasses of `GitweError` (`src/domain/errors/`) with a stable `code`
and an optional user-facing `hint`. Domain and application code never
`console.log`s or otherwise reports an error — the CLI's `action()` wrapper
(`src/cli/commands/shared.ts`) is the only place that turns a thrown
`GitweError` into console output or a JSON/YAML envelope, and into an exit
code (`2` for `CONFLICT`, `1` for everything else).

## Formatting and linting

- Prettier config: `.prettierrc.json` — double quotes, trailing commas,
  100-character width, arrow-function parens always.
- Run `npm run format` before opening a PR; CI runs `npm run format:check`.
- `npm run lint` runs ESLint over `src` and `tests`; `npm run typecheck` runs
  `tsc --noEmit`. Both run in CI on every PR.
