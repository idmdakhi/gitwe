# Project structure

This reflects the actual `src/` layout of the 1.0 Clean Architecture rewrite.
For what each layer is responsible for, see [ARCHITECTURE.md](./ARCHITECTURE.md).

```
gitwe/
├── src/
│ ├── domain/
│ │ ├── entities/
│ │ │ ├── base-branch.entity.ts
│ │ │ ├── branch-type.entity.ts
│ │ │ ├── workflow-config.entity.ts
│ │ │ └── index.ts
│ │ ├── value-objects/
│ │ │ └── branch-name.vo.ts
│ │ ├── ports/
│ │ │ ├── config-repository.port.ts
│ │ │ ├── git-repository.port.ts
│ │ │ ├── hook-runner.port.ts
│ │ │ ├── logger.port.ts
│ │ │ ├── operation-state-store.port.ts
│ │ │ └── index.ts
│ │ ├── services/
│ │ │ ├── config-validator.service.ts
│ │ │ ├── version-calculator.service.ts
│ │ │ └── workflow.service.ts
│ │ ├── errors/
│ │ │ └── index.ts
│ │ └── index.ts
│ │
│ ├── application/
│ │ ├── use-cases/
│ │ │ ├── init-workflow.use-case.ts
│ │ │ ├── start-branch.use-case.ts
│ │ │ ├── finish-branch.use-case.ts
│ │ │ ├── update-branch.use-case.ts
│ │ │ ├── publish-branch.use-case.ts
│ │ │ ├── delete-branch.use-case.ts
│ │ │ ├── list-branches.use-case.ts
│ │ │ ├── overview.use-case.ts
│ │ │ └── validate-workflow.use-case.ts
│ │ └── engine.ts        # Engine facade — what the CLI and library consumers call
│ │
│ ├── infrastructure/
│ │ ├── git/
│ │ │ ├── process-runner.ts
│ │ │ ├── shell-git-repository.adapter.ts
│ │ │ └── shell-git-repository.ts
│ │ ├── config/
│ │ │ ├── presets.ts                        # classic / github / gitlab
│ │ │ └── yaml-config-repository.adapter.ts
│ │ ├── hooks/
│ │ │ └── file-hook-runner.adapter.ts
│ │ ├── logger/
│ │ │ └── console-logger.adapter.ts
│ │ └── state/
│ │     └── file-operation-state-store.adapter.ts
│ │
│ ├── cli/
│ │ ├── commands/
│ │ │ ├── init.command.ts       # wired into program.ts — see commands.md
│ │ │ ├── start.command.ts      # wired
│ │ │ ├── finish.command.ts     # wired
│ │ │ ├── update.command.ts     # wired
│ │ │ ├── publish.command.ts    # wired
│ │ │ ├── delete.command.ts     # wired
│ │ │ ├── list.command.ts       # wired
│ │ │ ├── overview.command.ts   # wired
│ │ │ ├── validate.command.ts   # wired
│ │ │ ├── shared.ts             # loadEngine() / action() helpers used by every command above
│ │ │ └── (abort.ts, checkout.ts, clean.ts, commit-lint.ts, config.ts,
│ │ │      current.ts, doctor.ts, graph.ts, init.ts, list.ts, log.ts,
│ │ │      modules.ts, pull.ts, rebase.ts, rename.ts, status.ts, sync.ts,
│ │ │      tag.ts, track.ts, types.ts, update.command.ts's siblings, version.ts, ...)
│ │ │      # present on disk, NOT imported by program.ts — see the note
│ │ │      # at the top of commands.md before relying on any of these
│ │ ├── container.ts     # composition root: GlobalOptions -> EngineDeps
│ │ ├── options.ts        # OutputFormat / --format types (scaffolding, see ARCHITECTURE.md)
│ │ ├── output.ts          # colour helpers, JSON/YAML envelope, tree renderer
│ │ └── program.ts          # builds the Commander program — the source of truth for what's live
│ │
│ ├── index.ts            # library entry point: `import { Engine } from "gitwe"`
│ └── version.ts
│
├── tests/
│ ├── application/
│ │ └── finish-branch.use-case.test.ts
│ └── domain/
│   ├── config-validator.service.test.ts
│   ├── version-calculator.service.test.ts
│   └── workflow.service.test.ts
│
├── docs/
│ ├── ARCHITECTURE.md
│ ├── commands.md
│ ├── github-action.md
│ ├── structure.md              # this file
│ ├── using-in-ci.md
│ ├── workflow-definition.md
│ └── development/
│   ├── ROADMAP.md
│   ├── TODO.md
│   ├── coding-style.md
│   ├── contributing.md
│   ├── testing.md
│   └── rfcs/
│
├── .gitwe/                 # gitwe's own workflow definition (dogfooding)
│ ├── gitwe.yaml
│ └── preset/
│
├── action.yaml              # root GitHub Action (see docs/github-action.md — currently out of sync, see note there)
├── .github/
│ ├── actions/setup/          # install Node + deps (+optionally build) for this repo's own CI
│ └── workflows/
│
├── package.json
├── tsconfig*.json
└── vitest.config.ts
```

## Notes

- `src/cli/program.ts` is the single source of truth for which commands the
  `gitwe` binary actually exposes. Several files under `src/cli/commands/`
  (e.g. `doctor.ts`, `graph.ts`, `config.ts`, `checkout.ts`, `track.ts`,
  `rename.ts`, `current.ts`, `rebase.ts`) exist from an earlier iteration of
  the CLI and are not currently registered — see the note at the top of
  [commands.md](./commands.md).
- `.gitwe/` at the repository root is gitwe's own workflow definition, used to
  dogfood the tool on its own branches (see `.github/workflows/gitwe.yaml`).
  It is unrelated to a *consumer* repository's own `.gitwe/gitwe.yaml`.
- The `dist/` build output (from `npm run build`) is not shown; it mirrors
  `src/` and is what `package.json#bin` (`./dist/cli/program.js`) actually
  runs once installed.
