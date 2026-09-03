# Project structure

For what each layer is responsible for, see
[architecture overview](./overview.md).

```
gitwe/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── base-branch.entity.ts
│   │   │   ├── branch-type.entity.ts
│   │   │   ├── hook-config.entity.ts
│   │   │   ├── remote-config.entity.ts
│   │   │   ├── versioning-config.entity.ts
│   │   │   ├── workflow-config.entity.ts
│   │   │   └── index.ts
│   │   ├── value-objects/
│   │   │   └── branch-name.vo.ts
│   │   ├── ports/
│   │   │   ├── config-repository.port.ts
│   │   │   ├── git-repository.port.ts
│   │   │   ├── hook-runner.port.ts
│   │   │   ├── logger.port.ts
│   │   │   ├── operation-state-store.port.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── config-editor.service.ts
│   │   │   ├── config-validator.service.ts
│   │   │   ├── version-calculator.service.ts
│   │   │   └── workflow.service.ts
│   │   ├── config/
│   │   │   └── presets.ts                 # classic / github / gitlab
│   │   ├── errors/
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── init-workflow.use-case.ts
│   │   │   ├── start-branch.use-case.ts
│   │   │   ├── finish-branch.use-case.ts
│   │   │   ├── update-branch.use-case.ts
│   │   │   ├── publish-branch.use-case.ts
│   │   │   ├── delete-branch.use-case.ts
│   │   │   ├── list-branches.use-case.ts
│   │   │   ├── overview.use-case.ts
│   │   │   ├── validate-workflow.use-case.ts
│   │   │   └── track-branch.use-case.ts
│   │   └── engine.ts        # Engine facade — what the CLI and library consumers call
│   │                        # (also implements checkout/clean/pull/rename/tag/graph/config* directly)
│   │
│   ├── infrastructure/
│   │   ├── git/
│   │   │   ├── process-runner.ts
│   │   │   └── shell-git-repository.adapter.ts
│   │   ├── config/
│   │   │   ├── yaml-config-repository.adapter.ts
│   │   │   ├── hook-config-loader.ts
│   │   │   ├── remote-config-loader.ts
│   │   │   └── version-config-loader.ts
│   │   ├── hooks/
│   │   │   └── file-hook-runner.adapter.ts
│   │   ├── logger/
│   │   │   └── console-logger.adapter.ts
│   │   └── state/
│   │       └── file-operation-state-store.adapter.ts
│   │
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── init.command.ts
│   │   │   ├── init-wizard.ts        # interactive `gitwe init` flow
│   │   │   ├── start.command.ts
│   │   │   ├── finish.command.ts
│   │   │   ├── update.command.ts
│   │   │   ├── sync.command.ts
│   │   │   ├── pull.command.ts
│   │   │   ├── publish.command.ts
│   │   │   ├── delete.command.ts
│   │   │   ├── rename.command.ts
│   │   │   ├── track.command.ts
│   │   │   ├── checkout.command.ts
│   │   │   ├── list.command.ts
│   │   │   ├── types.command.ts
│   │   │   ├── current.command.ts
│   │   │   ├── overview.command.ts
│   │   │   ├── validate.command.ts
│   │   │   ├── doctor.command.ts
│   │   │   ├── clean.command.ts
│   │   │   ├── tag.command.ts
│   │   │   ├── rebase.command.ts
│   │   │   ├── abort.command.ts
│   │   │   ├── log.command.ts
│   │   │   ├── graph.command.ts
│   │   │   ├── config.command.ts       # list/add/edit/rename/delete subcommands
│   │   │   ├── version.command.ts
│   │   │   └── shared.ts               # loadEngine() / action() helpers used by every command above
│   │   ├── container.ts     # composition root: GlobalOptions -> EngineDeps
│   │   ├── options.ts        # OutputFormat / global-flag descriptors shared across commands
│   │   ├── output.ts          # CommandOutput: colour helpers, JSON/YAML envelope (RFC-0004)
│   │   ├── aliases.ts          # applies user-defined `cli.aliases` from the workflow definition
│   │   ├── prompts.ts            # ask/confirm/choose helpers for the init wizard
│   │   └── program.ts              # builds the Commander program — the source of truth for what's live
│   │
│   ├── index.ts             # library entry point: `import { Engine } from "gitwe"`
│   ├── utils.ts
│   └── version.ts
│
├── tests/
│   ├── application/
│   │   ├── finish-branch.use-case.test.ts
│   │   └── ...                          # one file per use case in src/application/use-cases/
│   └── domain/
│       ├── branch-name.vo.test.ts
│       ├── config-validator.service.test.ts
│       ├── version-calculator.service.test.ts
│       └── workflow.service.test.ts
│
├── docs/
│   ├── README.md
│   ├── guides/
│   │   ├── quickstart.md
│   │   ├── commands.md
│   │   ├── workflow-definition.md
│   │   ├── hooks.md
│   │   └── ci.md
│   ├── architecture/
│   │   ├── overview.md
│   │   └── project-structure.md      # this file
│   └── development/
│       ├── contributing.md
│       ├── coding-style.md
│       ├── testing.md
│       ├── roadmap.md
│       ├── specification.md
│       └── rfcs/
│
├── .gitwe/                  # gitwe's own workflow definition (dogfooding)
│   ├── gitwe.yaml
│   ├── hooks.yaml, remote.yaml, version.yaml, changelog.yaml
│   ├── hooks/
│   └── preset/
│
├── action.yaml               # root GitHub Action (see docs/guides/ci.md for its current compatibility status)
├── .github/
│   ├── actions/setup/          # install Node + deps for this repo's own CI (no gitwe flag translation)
│   ├── workflows/                # ci, test, e2e, compatibility, nightly, release, publish, gitwe (dogfood)
│   └── ISSUE_TEMPLATE/
│
├── package.json
├── tsconfig*.json
└── vitest.config.ts
```

## Notes

- `src/cli/program.ts` is the single source of truth for which commands the
  `gitwe` binary exposes — see the
  [command reference](../guides/commands.md).
- `.gitwe/` at the repository root is gitwe's own workflow definition, used
  to dogfood the tool on its own branches (see
  `.github/workflows/gitwe.yaml`). It is unrelated to a *consumer*
  repository's own `.gitwe/gitwe.yaml`.
- The `dist/` build output (from `npm run build`) is not shown; it mirrors
  `src/` and is what `package.json#bin` (`./dist/cli/index.js`) actually runs
  once installed.
