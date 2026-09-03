# Testing

gitwe is tested with [Vitest](https://vitest.dev). Configuration lives in
`vitest.config.ts` at the repository root.

```bash
npm test           # vitest run — single pass, used in CI
npm run test:watch # vitest — watch mode for local development
```

`vitest.config.ts` restricts the runner to `tests/**/*.test.ts` and configures
V8 coverage over `src/**/*.ts`, excluding `src/cli/**` (the CLI layer is
presentation-only and is exercised indirectly through the use cases and
`Engine` methods it calls).

## Layout

```
tests/
├── application/
│   ├── test-helpers.ts                  # shared fakeGit() / recordingHooks()
│   ├── delete-branch.use-case.test.ts
│   ├── finish-branch.use-case.test.ts
│   ├── init-workflow.use-case.test.ts
│   ├── list-branches.use-case.test.ts
│   ├── overview.use-case.test.ts
│   ├── publish-branch.use-case.test.ts
│   ├── start-branch.use-case.test.ts
│   ├── track-branch.use-case.test.ts
│   ├── update-branch.use-case.test.ts
│   └── validate-workflow.use-case.test.ts
└── domain/
    ├── branch-name.vo.test.ts
    ├── config-validator.service.test.ts
    ├── version-calculator.service.test.ts
    └── workflow.service.test.ts
```

Tests mirror the `src/` layer they exercise: `tests/domain/` for pure domain
services and value objects, `tests/application/` for use cases. Every use
case in `src/application/use-cases/` has a matching test file. There is no
`tests/infrastructure/` suite — the adapters (`ShellGitRepository`,
`YamlConfigRepository`, `FileHookRunner`, `FileOperationStateStore`) are
exercised end-to-end by `.github/workflows/e2e.yaml` against real throwaway
git repositories instead of by unit tests; see
["What isn't covered yet"](#what-isnt-covered-yet).

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

`config-validator.service.test.ts`, `workflow.service.test.ts`, and
`branch-name.vo.test.ts` follow the same pattern, several of them against
`classicPreset()` from `src/domain/config/presets.ts` (presets are plain
data, so importing them from a domain test doesn't cross the layer boundary
— nothing infrastructure-specific is exercised).

## Application tests: fakes, not mocks

Use cases depend only on domain ports (`GitRepository`, `HookRunner`,
`OperationStateStore`, `Logger`), so they're tested against small in-memory
implementations of those interfaces rather than a mocking library or a real
git repository. `tests/application/test-helpers.ts` holds the shared
building blocks every use-case test file imports:

- `fakeGit(overrides)` — an in-memory `GitRepository` seeded with a small set
  of branch names, every method stubbed to a sensible default. Individual
  tests override just the methods they care about (e.g. make `merge()` throw
  to simulate a conflict, or `remoteBranchExists()` return `true`).
- `recordingHooks()` — a `HookRunner` that records every `(name, context)`
  call instead of running anything, so tests can assert both *that* the
  right hooks fired and *what context* they received.
- `noopHooks` — a `HookRunner` that does nothing, for tests that don't care
  about hooks at all.

`finish-branch.use-case.test.ts` additionally defines a local
`memoryStateStore()` (an in-memory `OperationStateStore`) to cover the full
resumable `finish` state machine — success, a conflict that persists state
and throws `ConflictError`, resuming via `--continue`, and aborting via
`--abort` — without touching disk or spawning `git` at all. When you add a
new use case, extend `test-helpers.ts` rather than introducing a mocking
library or duplicating a fake per test file.

## What isn't covered yet

- **`ShellGitRepository`** (the real git adapter) has no dedicated unit
  tests. `.github/workflows/e2e.yaml` exercises it end-to-end against real
  throwaway git repositories (init → doctor → start → finish, plus a
  conflict/continue and a conflict/abort scenario) and does match the
  current CLI's commands and output format — but its conflict scenarios
  pass a `--strategy merge` flag that `finish` doesn't actually accept
  (only `--squash`/`--rebase`/`--no-ff` exist), and its abort scenario
  checks for a stale `.gitwe/operation.json` path instead of the real
  `.git/gitwe/operation.json`. Both of those steps currently "pass" only
  because they're wrapped in `set +e` / `|| true`. Fixing the workflow
  itself is tracked in the [roadmap](./roadmap.md).
- **CLI layer** (`src/cli/commands/*.command.ts`) is excluded from coverage
  and has no dedicated tests; it's kept intentionally thin (argument parsing
  + one `Engine`/use-case call + `out.ok()`) so that most of its logic is
  really application-layer logic already covered above.

## Writing a new test

1. Decide which layer the code lives in — that decides the test's folder and
   whether it needs a fake at all (see
   [architecture overview](../architecture/overview.md) and
   [coding-style.md](./coding-style.md)).
2. Domain: construct the service directly, no fakes needed.
3. Application (a new use case): import `fakeGit`/`recordingHooks`/`noopHooks`
   from `tests/application/test-helpers.ts`, and only override the methods
   your test path actually calls.
4. Run `npm run test:watch` while iterating, `npm test` before opening a PR.
5. `npm run typecheck` and `npm run lint` are separate scripts — CI runs both
   alongside `npm test` (see
   [`.github/workflows/test.yaml`](../../.github/workflows/test.yaml)).

## See also

- [Coding style](./coding-style.md)
- [Contributing](./contributing.md)
- [Architecture](../architecture/overview.md)
