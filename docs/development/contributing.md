# Contributing

## Setup

```bash
git clone https://github.com/idmdakhi/gitwe.git
cd gitwe
npm install
npm test
npm run build
```

Requires **Node.js ≥ 20** and **git ≥ 2.30** on PATH.

## Workflow

1. Open an issue (or pick an existing one) and say which **layer** it touches.
2. Branch from `main` (or `develop` if the team is using classic git-flow on this repo).
3. Keep PRs focused: one concern per PR when possible.
4. Fill in the PR template checklist — especially:
   - `domain` / `application` still do not import `infrastructure`
   - no duplicate names for the same domain concept
   - tests updated

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Run CLI via `tsx` without building |
| `npm run build` | Emit `dist/` |
| `npm run lint` | ESLint on `.ts` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run format` | Prettier write |

## Architecture pointers

- See [ARCHITECTURE.md](../ARCHITECTURE.md) for the layer map.
- See [coding-style.md](./coding-style.md) and [testing.md](./testing.md).
- User-facing command docs: [commands.md](../commands.md).
- Workflow file format: [workflow-definition.md](../workflow-definition.md).

## Licence

By contributing you agree that your contributions are licensed under the MIT licence of this project.
