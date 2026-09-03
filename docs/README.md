# gitwe documentation

Start with the [project README](../README.md) for an overview and installation.
Everything else is organised by audience below.

## Guides — using gitwe

| Doc | What's in it |
| --- | --- |
| [Quickstart](./guides/quickstart.md) | Install, initialise a workflow, run your first `start` → `finish` cycle |
| [Command reference](./guides/commands.md) | Every CLI command, flag, exit code and example |
| [Workflow definition reference](./guides/workflow-definition.md) | The full schema of `.gitwe/gitwe.yaml`: base branches, topic types, merge, versioning, remotes |
| [Hooks](./guides/hooks.md) | Hook lifecycle, inline/advanced/per-type hooks, `GITWE_*` environment variables, `when` conditions |
| [Using gitwe in CI](./guides/ci.md) | GitHub Actions and GitLab CI recipes, the official Action, exit-code conventions |

## Architecture — how gitwe is built

| Doc | What's in it |
| --- | --- |
| [Architecture overview](./architecture/overview.md) | Clean Architecture layers, dependency rules, the resumable `finish` state machine |
| [Project structure](./architecture/project-structure.md) | Annotated `src/`/`tests/` tree |

## Development — contributing to gitwe

| Doc | What's in it |
| --- | --- |
| [Contributing](./development/contributing.md) | Setup, workflow, PR checklist |
| [Coding style](./development/coding-style.md) | TypeScript conventions, layer rules, naming, errors |
| [Testing](./development/testing.md) | Vitest layout, domain vs. application tests, fakes over mocks |
| [Roadmap](./development/roadmap.md) | Where gitwe is going, by phase and priority |
| [Specification draft](./development/specification.md) | Outline for a vendor-neutral git-workflow specification gitwe could implement |
| [RFCs](./development/rfcs/README.md) | Design proposals for larger features |

## Reference

- [Changelog](../CHANGELOG.md)
- [Pull request template](../.github/pull_request_template.md)
