# gitwe

A configurable git branching-workflow engine. Define your workflow once — base
branches, topic types, merge rules, tagging, hooks — and gitwe generates a
consistent CLI and library API around it: `gitwe start`, `gitwe finish`,
`gitwe update`, `gitwe publish`, and more.

gitwe is not git-flow. git-flow (and GitHub Flow, GitLab Flow, trunk-based
development, ...) are just *presets* — starting points you can rename, extend,
or replace entirely by editing one definition file.

## Why gitwe

- **One definition, one tool.** Base branches and topic types live in
  `.gitwe/gitwe.yaml`. Everything else — branch naming, merge targets, tag
  bumps, hooks — is derived from that file.
- **Not locked to git-flow.** Ship the `classic` (git-flow), `github`, or
  `gitlab` preset, or describe a custom workflow from scratch.
- **Safe by default.** `finish` checks the topic branch is in sync with its
  remote before merging, and is resumable: a merge conflict persists progress
  to `.git/gitwe/operation.json` so you can fix the conflict and run
  `gitwe finish --continue` (or `--abort` to roll back) — even from a
  different terminal session.
- **Usable as a library.** Every command is a thin wrapper around `Engine`,
  which you can import directly in a Node/TypeScript script or a custom tool.
- **Clean Architecture under the hood.** Domain logic has zero I/O and is
  covered by fast unit tests; see [docs/architecture](./docs/architecture/overview.md).

## Install

```bash
npm install -g gitwe
```

Requires **Node.js ≥ 20** and `git` on `PATH`.

## Quick start

```bash
cd your-repo
gitwe init --preset classic     # writes .gitwe/gitwe.yaml, creates main/develop
gitwe start feature login       # creates and checks out feature/login
# ... commit work ...
gitwe finish feature/login --push
```

Run `gitwe init` with no `--defaults` flag in an interactive terminal for a
short wizard instead of accepting the preset as-is. See the
[quickstart guide](./docs/guides/quickstart.md) for a walkthrough and the
[command reference](./docs/guides/commands.md) for every flag.

## Library usage

```ts
import {
  Engine,
  ShellGitRepository,
  YamlConfigRepository,
  FileHookRunner,
  FileOperationStateStore,
  ConsoleLogger,
} from "gitwe";

const root = process.cwd();
const engine = await Engine.create({
  configRepo: new YamlConfigRepository(root),
  git: new ShellGitRepository(root),
  hooks: new FileHookRunner(root, { enabled: true, path: ".gitwe/hooks", config: ".gitwe/hooks.yaml" }),
  stateStore: new FileOperationStateStore(root),
  logger: new ConsoleLogger(),
});

const resolved = await engine.start("feature", "login");
console.log(resolved.branch); // "feature/login"
```

`Engine.create` throws `NotInitializedError` if no workflow definition exists
yet — call `Engine.init(deps, { preset: "classic" })` first, or pass an
explicit `config`. See [`src/cli/container.ts`](./src/cli/container.ts) for
how the CLI itself wires these same adapters together.

## Documentation

Full documentation lives in [`docs/`](./docs/README.md):

- [Quickstart](./docs/guides/quickstart.md)
- [Command reference](./docs/guides/commands.md)
- [Workflow definition reference](./docs/guides/workflow-definition.md)
- [Hooks](./docs/guides/hooks.md)
- [Using gitwe in CI](./docs/guides/ci.md)
- [Architecture](./docs/architecture/overview.md)
- [Contributing](./docs/development/contributing.md)
- [Changelog](./CHANGELOG.md)

## License

MIT
