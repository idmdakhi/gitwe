# Testing

gitwe is tested with [Vitest](https://vitest.dev). Configuration lives in
`vitest.config.ts` at the repository root.

```bash
npm test          # vitest run — single pass, used in CI
npm run test:watch # vitest — watch mode for local development
```

`vitest.config.ts` restricts the runner to `tests/**/*.test.ts` and configures
V8 coverage over `src/**/*.ts`, excluding `src/cli/**` (the CLI layer is
presentation-only and is exercised indirectly through the use cases it calls).

## Layout

```
tests/
├── application/
│   └── finish-branch.use-case.test.ts
└── domain/
    ├── config-validator.service.test.ts
    ├── version-calculator.service.test.ts
    └── workflow.service.test.ts
```

Tests mirror the `src/` layer they exercise: `tests/domain/` for pure domain
services, `tests/application/` for use cases. There is currently no
`tests/infrastructure/` suite — `ShellGitRepository` is covered indirectly
through the application tests below and is a known coverage gap tracked in
[TODO.md](./TODO.md) ("Raise test coverage on `ShellGitRepository`").

## Domain tests

Domain services take no I/O dependencies, so these tests need no git
repository, no filesystem and no mocking framework — just plain
construct-and-assert:

```ts
import { describe, expect, it } from "vitest";
import { VersionCalculatorService } from "../../src/domain/services/version-calculator.service.js";

describe("VersionCalculatorService", () => {
  const calc = new VersionCalculatorService();

  it("bumps minor and resets patch", () => {
    expect(calc.format(calc.bump("1.4.9", "minor"), "v")).toBe("v1.5.0");
  });
});
```

`config-validator.service.test.ts` and `workflow.service.test.ts` follow the
same pattern against `classicPreset()` from
`src/domain/config/presets.ts` (presets are plain data, so importing
them from a domain test doesn't cross the layer boundary — nothing infrastructure-specific
is exercised).

## Application tests: fakes, not mocks

Use cases depend only on domain ports (`GitRepository`, `HookRunner`,
`OperationStateStore`, `Logger`), so they're tested against small in-memory
implementations of those interfaces rather than a mocking library or a real
git repository. `tests/application/finish-branch.use-case.test.ts` defines two
local helpers:

- `fakeGit(overrides)` — an in-memory `GitRepository` backed by a `Set` of
  branch names, with every method stubbed to a sensible default. Individual
  tests override just the methods they care about (e.g. make `merge()` throw
  to simulate a conflict).
- `memoryStateStore()` — an in-memory `OperationStateStore` closing over a
  local variable instead of writing `.gitwe/state.json`.

This is what lets the suite cover the full resumable `finish` state machine —
success, a conflict that persists state and throws `ConflictError`, resuming
via `--continue`, and aborting via `--abort` — without touching disk or
spawning `git` at all. When you add a new use case, prefer extending this
pattern (a small fake per port) over introducing a mocking library.

## What isn't covered yet

- **`ShellGitRepository`** (the real git adapter) has no dedicated unit tests.
  The `.github/workflows/e2e.yaml` and `compatibility.yaml` workflows exercise
  it end-to-end against real throwaway git repositories, but as of this
  writing those workflows — and the commands they invoke (`doctor`,
  `--format json`, `--defaults`, `finish --keep`) — predate the Clean
  Architecture rewrite and do not match the CLI actually wired in
  `src/cli/program.ts` (see the note at the top of
  [commands.md](../commands.md)). Re-aligning them is tracked in
  [TODO.md](./TODO.md) under _"Re-enable the currently disabled jobs"_ and
  _"Verify e2e workflows still work after the 1.0 rewrite."_
- **CLI layer** (`src/cli/commands/*.command.ts`) is excluded from coverage
  and has no dedicated tests; it's kept intentionally thin (argument parsing +
  one `Engine` call + `console.log`) so that most of its logic is really
  application-layer logic already covered above.

## Writing a new test

1. Decide which layer the code lives in — that decides the test's folder and
   whether it needs a fake at all (see [ARCHITECTURE.md](../ARCHITECTURE.md)
   and [coding-style.md](./coding-style.md)).
2. Domain: construct the service directly, no fakes needed.
3. Application (a new use case): write a small fake for each port it depends
   on, following `fakeGit()` / `memoryStateStore()` as a template. Only stub
   the methods your test path actually calls; add overrides per test.
4. Run `npm run test:watch` while iterating, `npm test` before opening a PR.
5. `npm run typecheck` and `npm run lint` are separate scripts — CI runs both
   alongside `npm test` (see [`.github/workflows/test.yaml`](../../.github/workflows/test.yaml)).

## See also

- [Coding style](./coding-style.md)
- [Contributing](./contributing.md)
- [Architecture](../ARCHITECTURE.md)
