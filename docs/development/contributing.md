# Contributing

## Setup

```bash
git clone https://github.com/idmdakhi/gitwe.git
cd gitwe
npm install
npm test
npm run build
```

Requires **Node.js ≥ 20** and **git ≥ 2.30** on `PATH`.

## Workflow

1. Open an issue (or pick an existing one) and say which **layer** it touches
   — domain, application, infrastructure, or CLI (see the
   [architecture overview](../architecture/overview.md)).
2. Branch from `main`. This repository dogfoods gitwe itself: its own
   workflow definition lives in `.gitwe/gitwe.yaml`, so `gitwe start feature
   <name>` works here too.
3. Keep PRs focused — one concern per PR where possible.
4. Fill in the [PR template](../../.github/pull_request_template.md)
   checklist, especially:
   - `domain`/`application` still don't import `infrastructure` or `cli`
     (see [coding-style.md](./coding-style.md#layer-rules));
   - no duplicate names for the same domain concept;
   - tests updated — new use cases and services need domain/application
     tests (see [testing.md](./testing.md));
   - docs updated if you touched a command, flag, or the workflow schema.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | run the CLI via `tsx`, no build step |
| `npm run build` | emit `dist/` |
| `npm run lint` | ESLint on `.ts` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run format` | Prettier write |

## Where things live

- Layer responsibilities and dependency rules:
  [architecture overview](../architecture/overview.md)
- Annotated source tree:
  [project structure](../architecture/project-structure.md)
- TypeScript conventions, error/logging style:
  [coding-style.md](./coding-style.md)
- Test layout and philosophy: [testing.md](./testing.md)
- User-facing command docs: [commands.md](../guides/commands.md)
- Workflow file schema: [workflow-definition.md](../guides/workflow-definition.md)
- Larger feature proposals: [RFCs](./rfcs/README.md)

## License

By contributing you agree that your contributions are licensed under the MIT
license of this project.
