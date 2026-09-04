# Quickstart

Get started with `gitwe` in 5 minutes.

## Prerequisites

- Node.js **20.x** or later
- Git **2.30** or later
- An existing Git repository (or create one with `git init`)

## 1. Install

Install globally via npm:

```bash
npm install -g gitwe
```

Alternatively, use it via `npx` without installing:

```bash
npx gitwe --help
```

## 2. Initialize a Workflow

Navigate to your Git repository and run:

```bash
gitwe init --preset classic
```

This creates a `.gitwe/gitwe.yaml` file with the classic Git Flow preset (main, develop, feature/, release/, hotfix/).
You can also run `gitwe init` without flags to use the interactive wizard.

## 3. Start a Feature Branch

Create a new feature branch:

```bash
gitwe start feature login-page
```

This creates and switches to `feature/login-page` based on the `develop` branch.

## 4. Do Your Work

Make your changes, commit them as usual:

```bash
git add .
git commit -m "feat: add login form"
```

## 5. Finish the Feature

Merge the feature back into `develop` and optionally push everything:

```bash
gitwe finish feature/login-page --push
```

If there are conflicts, gitwe will pause and let you resolve them, then run:

```bash
gitwe finish --continue
```

## Next Steps

- Read the full [Command Reference](../user-guide/commands.md)
- Learn about [Workflow Definition](../user-guide/workflow-definition.md)
- See how to use it in [CI](../user-guide/ci.md)
