# First Workflow

Walk through creating your first gitwe-managed project.

## Step 1: Prepare the Repository

Ensure you are in a Git repository:

```bash
mkdir my-project
cd my-project
git init
git commit --allow-empty -m "Initial commit"
git checkout -b main
```

## Step 2: Initialize gitwe

Run the interactive init:

```bash
gitwe init
```

Or use a preset directly:

```bash
gitwe init --preset classic
```

This creates:
- `.gitwe/gitwe.yaml` – The workflow definition file.
- `.gitwe/` – The internal state directory (gitignored by default).

## Step 3: Explore the Generated Config

Open `.gitwe/gitwe.yaml`. It should look like this (for the `classic` preset):

```yaml
schemaVersion: 1
baseBranches:
  - name: main
  - name: develop
branchTypes:
  - name: feature
    extends: develop
    target: develop
    prefix: feature/
  - name: release
    extends: develop
    target: main
    prefix: release/
  - name: hotfix
    extends: main
    target: main
    prefix: hotfix/
```

## Step 4: Start a Feature Branch

Create a new feature:

```bash
gitwe start feature add-readme
```

This switches you to `feature/add-readme` based on `develop`.

## Step 5: Make a Change

Add a `README.md` file and commit it:

```bash
echo "# My Project" > README.md
git add README.md
git commit -m "docs: add README"
```

## Step 6: Finish the Feature

Merge it back into `develop`:

```bash
gitwe finish feature/add-readme
```

By default, this does **not** push automatically. To push, add `--push`.

## Step 7: Verify

Check the branch status:

```bash
gitwe overview
```

You should see that you are back on `develop` and the feature branch has been deleted locally.

## What's Next?

- Learn about [Hooks](../user-guide/hooks.md) to automate tasks.
- Explore [Branching Models](../concepts/branching-models.md) to customize your workflow.
- Run `gitwe --help` to see all available commands.
