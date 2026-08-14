gitwe/
├── src/
│ ├── application/
│ │ ├── commands/
│ │ │ ├── start.ts
│ │ │ ├── finish.ts
│ │ │ ├── publish.ts
│ │ │ ├── abort.ts
│ │ │ ├── sync.ts
│ │ │ ├── status.ts
│ │ │ ├── list.ts
│ │ │ └── index.ts
│ │ │
│ │ ├── services/
│ │ │ ├── branch-service.ts
│ │ │ ├── merge-service.ts
│ │ │ ├── tag-service.ts
│ │ │ ├── release-service.ts
│ │ │ └── workflow-service.ts
│ │ │
│ │ └── dto/
│ │
│ ├── domain/
│ │ ├── entities/
│ │ │ ├── branch.ts
│ │ │ ├── tag.ts
│ │ │ ├── workflow.ts
│ │ │ └── repository.ts
│ │ │
│ │ ├── value-objects/
│ │ │ ├── branch-name.ts
│ │ │ ├── version.ts
│ │ │ ├── tag-name.ts
│ │ │ └── commit-id.ts
│ │ │
│ │ ├── interfaces/
│ │ │ ├── git-repository.ts
│ │ │ ├── config-repository.ts
│ │ │ └── console.ts
│ │ │
│ │ └── errors/
│ │
│ ├── infrastructure/
│ │ ├── git/
│ │ │ ├── shell-git-repository.ts
│ │ │ ├── git-process.ts
│ │ │ └── git-error.ts
│ │ │
│ │ ├── cli/
│ │ │ ├── commands/
│ │ │ ├── parser.ts
│ │ │ └── program.ts
│ │ │
│ │ ├── config/
│ │ ├── logger/
│ │ └── filesystem/
│ │
│ ├── shared/
│ │ ├── utils/
│ │ ├── constants/
│ │ └── types/
│ │
│ └── index.ts
│
├── tests/
│ ├── application/
│ ├── domain/
│ ├── infrastructure/
│ ├── integration/
│ ├── helpers/
│ └── fixtures/
│
├── docs/
│ ├── commands/
│ ├── configuration/
│ ├── examples/
│ └── workflow/
│
└── examples/
