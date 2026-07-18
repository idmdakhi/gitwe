# gitwe

[![npm version](https://badge.fury.io/js/gitwe.svg)](https://www.npmjs.com/package/gitwe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**gitwe** is a configurable, rule-based git branching workflow engine. It goes beyond classic git-flow by letting you define your own branch types and rules via a simple JSON config.

## Features

- 🚀 **Custom workflows** – Define any branching strategy (git-flow, GitHub Flow, trunk-based, etc.)
- 🔧 **CLI & Library** – Use as a command-line tool or integrate into your Node.js projects
- 🧪 **Testable** – Built with dependency injection; unit tests run without a real git repo
- 📦 **Lightweight** – No external git library; uses the native `git` binary
- ✅ **TypeScript** – Fully typed for great IDE support

## Installation

### Global (CLI)

```bash
npm install -g gitwe
```

### Local (as a library)

```bash
npm install gitwe
```

## Usage

### CLI Commands

```bash
# Show current branch
gitwe current

# List all local branches
gitwe list

# Show available branch types
gitwe types

# Start a new feature branch
gitwe start feature login-page

# Finish the branch (merge and delete)
gitwe finish feature/login-page

# Use a custom workflow config
gitwe --config my-workflow.json start change fix-issue
```

### As a Library

```typescript
import { WorkflowEngine, ShellGitAdapter, gitFlowDefinition } from "gitwe";

const engine = new WorkflowEngine(new ShellGitAdapter(process.cwd()), gitFlowDefinition);

await engine.start("feature", "awesome-feature");
await engine.finish("feature/awesome-feature");
```

## Custom Workflow Definition

Create a JSON file (e.g., `my-workflow.json`):

```json
{
  "name": "trunk-based",
  "branchTypes": [
    {
      "name": "change",
      "prefix": "change/",
      "baseBranch": "main",
      "mergeTargets": ["main"],
      "deleteOnFinish": true
    }
  ]
}
```

Then use it:

```bash
gitwe --config gitwe.json start change fix-123
gitwe --config gitwe.json finish change/fix-123
```

### Built-in Workflows

The engine comes with a built-in **git-flow** definition:

| Type    | Prefix     | Base Branch | Merge Targets     | Deleted on Finish |
| ------- | ---------- | ----------- | ----------------- | ----------------- |
| feature | `feature/` | `develop`   | `develop`         | ✅                |
| release | `release/` | `develop`   | `main`, `develop` | ✅                |
| hotfix  | `hotfix/`  | `main`      | `main`, `develop` | ✅                |

You can override this by providing your own config file with `--config`.

## Configuration Reference

| Field                          | Type       | Description                               |
| ------------------------------ | ---------- | ----------------------------------------- |
| `name`                         | `string`   | Name of the workflow (for logging)        |
| `branchTypes`                  | `array`    | List of branch type rules                 |
| `branchTypes[].name`           | `string`   | Unique type name (e.g., `"feature"`)      |
| `branchTypes[].prefix`         | `string`   | Branch name prefix (e.g., `"feature/"`)   |
| `branchTypes[].baseBranch`     | `string`   | Branch to start from (e.g., `"develop"`)  |
| `branchTypes[].mergeTargets`   | `string[]` | Branches to merge into when finishing     |
| `branchTypes[].deleteOnFinish` | `boolean`  | Auto‑delete after finish (default `true`) |

## Development

```bash
git clone https://github.com/your-username/gitwe
cd gitwe
npm install
npm run build
npm test
```

### Available Scripts

| Script                  | Description                              |
| ----------------------- | ---------------------------------------- |
| `npm run build`         | Compile TypeScript to `dist/`            |
| `npm run dev`           | Run CLI with `ts-node` (for development) |
| `npm run test`          | Run tests with Vitest                    |
| `npm run test:watch`    | Run tests in watch mode                  |
| `npm run test:coverage` | Generate coverage report                 |
| `npm run lint`          | Run ESLint                               |
| `npm run format`        | Format code with Prettier                |
| `npm run typecheck`     | Run TypeScript compiler with no emit     |

## License

MIT

# 1. نصب وابستگی‌ها (اگر تازه clone کرده‌اید)

npm install

# 2. اجرای lint و typecheck و تست

npm run lint
npm run typecheck
npm test

# 3. ساخت خروجی نهایی

npm run build

# 4. تست CLI به‌صورت محلی

node dist/cli/index.js --help
node dist/cli/index.js --version

# 5. تست با کانفیگ سفارشی

node dist/cli/index.js --config workflow.json types
