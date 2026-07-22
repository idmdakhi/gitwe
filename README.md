# gitwe

[![npm version](https://badge.fury.io/js/gitwe.svg)](https://www.npmjs.com/package/gitwe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**gitwe** (Git Workflow Engine) is a configurable, rule-based git branching workflow engine. It goes beyond classic git-flow by letting you define your own branch types and rules via a simple JSON or YAML config.

## Features

- 🚀 **Custom workflows** – Define any branching strategy (git-flow, GitHub Flow, trunk-based, multi-stage, etc.)
- 🔧 **CLI & Library** – Use as a command-line tool or integrate into your Node.js projects
- 🧪 **Testable** – Built with dependency injection; unit tests run without a real git repo
- 📦 **Lightweight** – No external git library; uses the native `git` binary
- ✅ **TypeScript** – Fully typed for great IDE support
- 🔌 **Hooks** – Run custom scripts before/after operations (lint, test, build, deploy)
- 🏷️ **Auto-tagging** – Automatically create version tags for releases
- 🌐 **Remote support** – Auto-push and auto-pull with configurable remotes

---

## Installation

### Global (CLI)

```bash
npm install -g gitwe
```

### Local (as a library)

```bash
npm install gitwe
```

---

## Usage

### CLI Commands

```bash
# Show current branch
gitwe current

# List all local branches
gitwe list

# Show available branch types from current workflow
gitwe types

# Start a new branch
gitwe start feature login-page

# Finish a branch (merge to targets, auto-tag, delete)
gitwe finish feature/login-page

# Show visual branch tree
gitwe status

# Use a custom config (JSON or YAML)
gitwe --config my-workflow.yaml start change fix-issue
```

### As a Library

```typescript
import { WorkflowEngine, ShellGitAdapter, gitFlowDefinition } from "gitwe";

const engine = new WorkflowEngine(new ShellGitAdapter(process.cwd()), gitFlowDefinition);

await engine.start("feature", "awesome-feature");
await engine.finish("feature/awesome-feature");
```

---

## Custom Workflow Definitions

Create a configuration file (JSON or YAML) to define your own branching strategy.

### 1. Classic Git-Flow

```json
{
  "name": "git-flow",
  "branchTypes": [
    {
      "name": "feature",
      "prefix": "feature/",
      "baseBranch": "develop",
      "mergeTargets": ["develop"],
      "deleteOnFinish": true
    },
    {
      "name": "release",
      "prefix": "release/",
      "baseBranch": "develop",
      "mergeTargets": ["main", "develop"],
      "deleteOnFinish": true,
      "autoTag": {
        "prefix": "v"
      }
    },
    {
      "name": "hotfix",
      "prefix": "hotfix/",
      "baseBranch": "main",
      "mergeTargets": ["main", "develop"],
      "deleteOnFinish": true
    }
  ]
}
```

### 2. GitHub Flow (Simple)

```json
{
  "name": "github-flow",
  "branchTypes": [
    {
      "name": "feature",
      "prefix": "feature/",
      "baseBranch": "main",
      "mergeTargets": ["main"],
      "deleteOnFinish": true
    }
  ]
}
```

### 3. Trunk-Based Development

```json
{
  "name": "trunk-based",
  "branchTypes": [
    {
      "name": "feature",
      "prefix": "feat/",
      "baseBranch": "main",
      "mergeTargets": ["main"],
      "deleteOnFinish": true
    },
    {
      "name": "bugfix",
      "prefix": "fix/",
      "baseBranch": "main",
      "mergeTargets": ["main"],
      "deleteOnFinish": true
    }
  ]
}
```

### 4. Two-Branch (develop + main)

```json
{
  "name": "two-branch",
  "branchTypes": [
    {
      "name": "feature",
      "prefix": "feature/",
      "baseBranch": "develop",
      "mergeTargets": ["develop"],
      "deleteOnFinish": true
    },
    {
      "name": "hotfix",
      "prefix": "hotfix/",
      "baseBranch": "main",
      "mergeTargets": ["main", "develop"],
      "deleteOnFinish": true
    }
  ]
}
```

### 5. Multi-Stage (staging + main)

```json
{
  "name": "multi-stage",
  "branchTypes": [
    {
      "name": "feature",
      "prefix": "feature/",
      "baseBranch": "develop",
      "mergeTargets": ["staging", "main"],
      "deleteOnFinish": true
    }
  ]
}
```

### 6. With Hooks (Custom Scripts)

```json
{
  "name": "git-flow-with-hooks",
  "branchTypes": [
    {
      "name": "feature",
      "prefix": "feature/",
      "baseBranch": "develop",
      "mergeTargets": ["develop"],
      "deleteOnFinish": true
    }
  ],
  "hooks": {
    "preStart": ["npm run lint"],
    "postStart": ["echo '🎉 Branch created!'"],
    "preFinish": ["npm run test", "npm run build"],
    "postFinish": ["echo '✅ Branch finished!'"]
  }
}
```

### 7. With Remote Configuration

```json
{
  "name": "git-flow-remote",
  "branchTypes": [
    {
      "name": "feature",
      "prefix": "feature/",
      "baseBranch": "develop",
      "mergeTargets": ["develop"],
      "deleteOnFinish": true
    }
  ],
  "remote": {
    "remote": "origin",
    "autoPush": true,
    "autoPull": true
  }
}
```

### 8. Complete Example (All Features)

```json
{
  "name": "git-flow-pro",
  "branchTypes": [
    {
      "name": "feature",
      "prefix": "feature/",
      "baseBranch": "develop",
      "mergeTargets": ["develop"],
      "deleteOnFinish": true
    },
    {
      "name": "release",
      "prefix": "release/",
      "baseBranch": "develop",
      "mergeTargets": ["main", "develop"],
      "deleteOnFinish": true,
      "autoTag": {
        "prefix": "v"
      }
    },
    {
      "name": "hotfix",
      "prefix": "hotfix/",
      "baseBranch": "main",
      "mergeTargets": ["main", "develop"],
      "deleteOnFinish": true
    }
  ],
  "hooks": {
    "preStart": ["npm run lint"],
    "postStart": ["echo '🎉 Branch created!'"],
    "preFinish": ["npm run test", "npm run build"],
    "postFinish": ["echo '✅ Branch finished!'"]
  },
  "remote": {
    "remote": "origin",
    "autoPush": false,
    "autoPull": false
  }
}
```

### Usage with Config

```bash
# Using JSON config
gitwe --config gitwe.json start feature login
gitwe --config gitwe.json finish feature/login

# Combined with other options
gitwe --config my-workflow.yaml start feature login --push
gitwe --config my-workflow.yaml finish feature/login --keep --tag
```

---

## Configuration Reference

### `WorkflowDefinition` (Root)

| Field         | Type               | Required | Description                            |
| ------------- | ------------------ | -------- | -------------------------------------- |
| `name`        | `string`           | ✅       | Name of the workflow (for logging)     |
| `branchTypes` | `BranchTypeRule[]` | ✅       | List of branch type rules              |
| `hooks`       | `HookDefinition`   | ❌       | Custom scripts before/after operations |
| `remote`      | `RemoteConfig`     | ❌       | Remote repository configuration        |

### `BranchTypeRule`

| Field            | Type            | Required | Description                                           |
| ---------------- | --------------- | -------- | ----------------------------------------------------- |
| `name`           | `string`        | ✅       | Unique type name (e.g., `"feature"`)                  |
| `prefix`         | `string`        | ✅       | Branch name prefix (e.g., `"feature/"`)               |
| `baseBranch`     | `string`        | ✅       | Branch to start from (e.g., `"develop"`)              |
| `mergeTargets`   | `string[]`      | ✅       | Branches to merge into when finishing (order matters) |
| `deleteOnFinish` | `boolean`       | ❌       | Auto‑delete after finish (default `true`)             |
| `autoTag`        | `AutoTagConfig` | ❌       | Automatic version tagging (useful for releases)       |

### `AutoTagConfig`

| Field     | Type     | Description                                                          |
| --------- | -------- | -------------------------------------------------------------------- |
| `prefix`  | `string` | Prefix for the tag, e.g., `"v"` → `v1.2.0` (default: `"v"`)          |
| `pattern` | `string` | Pattern to extract version from branch name (default: remove prefix) |

### `HookDefinition`

| Field        | Type       | Description                                        |
| ------------ | ---------- | -------------------------------------------------- |
| `preStart`   | `string[]` | Commands before `start` (e.g., `["npm run lint"]`) |
| `postStart`  | `string[]` | Commands after `start`                             |
| `preFinish`  | `string[]` | Commands before `finish`                           |
| `postFinish` | `string[]` | Commands after `finish`                            |

### `RemoteConfig`

| Field      | Type      | Description                                          |
| ---------- | --------- | ---------------------------------------------------- |
| `remote`   | `string`  | Remote name (default: `"origin"`)                    |
| `autoPush` | `boolean` | Auto-push after `start`/`finish` (default: `false`)  |
| `autoPull` | `boolean` | Auto-pull before `start`/`finish` (default: `false`) |

---

## Built-in Workflows

The engine comes with a built-in **git-flow** definition if no config is provided:

| Type      | Prefix     | Base Branch | Merge Targets     | Deleted on Finish | Auto-Tag |
| --------- | ---------- | ----------- | ----------------- | ----------------- | -------- |
| `feature` | `feature/` | `develop`   | `develop`         | ✅                | ❌       |
| `release` | `release/` | `develop`   | `main`, `develop` | ✅                | ✅ (v)   |
| `hotfix`  | `hotfix/`  | `main`      | `main`, `develop` | ✅                | ❌       |

---

## Development

```bash
git clone https://github.com/your-username/gitwe
cd gitwe
npm install
npm run build
npm test
```

### Available Scripts

| Script                  | Description                               |
| ----------------------- | ----------------------------------------- |
| `npm run build`         | Compile TypeScript to `dist/`             |
| `npm run dev`           | Run CLI with `ts-node` (development mode) |
| `npm run test`          | Run tests with Vitest                     |
| `npm run test:watch`    | Run tests in watch mode                   |
| `npm run test:coverage` | Generate coverage report                  |
| `npm run lint`          | Run ESLint                                |
| `npm run format`        | Format code with Prettier                 |
| `npm run typecheck`     | Run TypeScript compiler with no emit      |

---

## License

MIT

