# Testing

## Stack

- **Vitest** (`npm test`, `npm run test:watch`)
- Real `git` on PATH (no mocks of the binary in engine tests)
- Temp repos via `tests/support/repo.ts` (`TestRepo`)

## Layout

| Path | Covers |
|------|--------|
| `tests/core/` | Domain: parse, editor, presets, branch names, `Workflow` |
| `tests/engine/` | Application: start, finish, update, hooks, remotes |
| `tests/cli/` | Commander wiring and end-to-end-ish CLI flows |
| `tests/support/repo.ts` | Temp git repo + `createEngine` helper |

## Writing a test

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TestRepo } from "../support/repo.js";

describe("Engine.start", () => {
  let repo: TestRepo;

  beforeEach(() => {
    repo = TestRepo.create();
  });

  afterEach(() => {
    repo.destroy();
  });

  it("creates a feature branch from develop", async () => {
    const engine = await repo.engine(); // classic preset + base branches
    const result = await engine.start("feature", "login");
    expect(result.branch).toBe("feature/login");
  });
});
```

## Conventions

- Prefer **engine API** tests over CLI tests when asserting workflow behaviour.
- Use CLI tests for argv parsing, exit codes, and generated topic commands.
- Remote scenarios use `TestRepo.createBare()` as `origin`.
- Do not rely on the developer’s global git config; `TestRepo` sets `user.name` / `user.email` and disables GPG signing.

## Commands

```bash
npm test                 # single run
npm run test:watch       # watch mode
npm run test:coverage    # coverage (excludes src/cli by default)
```

CI runs the suite on Node 22 and 24 (see `.github/workflows/test.yaml`).
