# GitHub Action — gitwe

> ⚠️ **Compatibility notice.** The root [`action.yaml`](../action.yaml)
> described on this page targets the CLI as it existed _before_ the 1.0 Clean
> Architecture rewrite: it invokes `dist/cli/index.js` with flags like
> `--json`, `--workflow`, `--no-delete`, `--abort-on-conflict`, `--strategy`
> and commands like `status`, `graph`, `doctor`, `config`. The rewritten CLI
> (documented in [commands.md](./commands.md)) ships a different binary path
> (`dist/cli/program.js`), a different flag set, and only nine commands —
> `doctor`, `graph`, `config`, `status`'s `--root`, and most flags below are
> **not implemented in the current CLI** (see the "Not yet available" section
> of [commands.md](./commands.md)). Re-aligning the Action with the rewrite is
> tracked in [TODO.md](./development/TODO.md) under _"Verify `publish.yaml`
> matrix ... still works after the 1.0 rewrite"_ and the CI-hygiene items
> above it. Until that's done, treat everything below as the Action's
> **intended/target interface**, not a guarantee of what will run against
> today's `main`. For a workflow you can rely on right now, use the plain
> Node install steps in [using-in-ci.md](./using-in-ci.md), which are kept in
> sync with [commands.md](./commands.md).

Use the official **gitwe** Action to run workflow commands (`start`, `finish`, `status`, `graph`, `doctor`, …) inside any GitHub Actions workflow.

The Action is defined at the repository root (`action.yaml`) and can be referenced as:

| Reference                   | When to use                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| `uses: idmdakhi/gitwe@v1`   | From **another** repository (after publishing a release tag)           |
| `uses: idmdakhi/gitwe@main` | From another repo, always latest main (not recommended for production) |
| `uses: ./`                  | **Inside this repository** (self-test / dogfooding)                    |

---

## Inputs

| Input               | Required     | Default   | Description                                                                                      |
| ------------------- | ------------ | --------- | ------------------------------------------------------------------------------------------------ |
| `command`           | ✅           | —         | Command to run: `start`, `finish`, `status`, `graph`, `current`, `list`, `validate`, `doctor`, … |
| `type`              | for `start`  | —         | Branch type (`feature`, `release`, `hotfix`, …)                                                  |
| `short-name`        | for `start`  | —         | Short name (e.g. `login`)                                                                        |
| `branch-name`       | for `finish` | —         | Full branch name (e.g. `feature/login`)                                                          |
| `workflow`          | no           | `classic` | Built-in preset: `classic` \| `github` \| `gitlab`                                               |
| `config`            | no           | —         | Path to a custom workflow file (overrides `workflow`)                                            |
| `delete-branch`     | no           | `true`    | Delete the topic branch after `finish`                                                           |
| `push`              | no           | `false`   | Push updated branches / tags after `finish`                                                      |
| `abort-on-conflict` | no           | `false`   | Abort merge on conflict                                                                          |
| `root`              | no           | `main`    | Root branch for `status` / `graph`                                                               |
| `working-directory` | no           | `.`       | Directory of the git repository                                                                  |
| `dry-run`           | no           | `false`   | Only print what would happen                                                                     |
| `strategy`          | no           | `merge`   | `merge` \| `squash` \| `rebase`                                                                  |
| `node-version`      | no           | `22`      | Node.js version used to run gitwe                                                                |

## Outputs

| Output        | Description                                              |
| ------------- | -------------------------------------------------------- |
| `branch-name` | Created or finished branch                               |
| `merged-into` | Comma-separated list of branches that received the merge |
| `tags`        | Comma-separated list of tags created                     |
| `result-json` | Full JSON result of the command                          |

---

## Basic usage (another repository)

```yaml
name: Feature workflow

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  gitwe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
        with:
          fetch-depth: 0

      - name: Start feature branch
        uses: idmdakhi/gitwe@v1
        with:
          command: start
          type: feature
          short-name: ${{ github.head_ref }}

      - name: Show status
        uses: idmdakhi/gitwe@v1
        with:
          command: status
```

### Finish on merge to main

```yaml
- name: Finish feature
  if: github.event.pull_request.merged == true
  uses: idmdakhi/gitwe@v1
  with:
    command: finish
    branch-name: feature/${{ github.head_ref }}
    push: true
    strategy: squash
```

### Custom config file

```yaml
- uses: idmdakhi/gitwe@v1
  with:
    command: validate
    config: .gitwe/gitwe.yaml
```

### Dry-run

```yaml
- uses: idmdakhi/gitwe@v1
  with:
    command: finish
    branch-name: feature/login
    dry-run: true
```

### Using outputs

```yaml
- name: Start
  id: start
  uses: idmdakhi/gitwe@v1
  with:
    command: start
    type: feature
    short-name: billing

- name: Print branch
  run: echo "Created ${{ steps.start.outputs.branch-name }}"
```

---

## Usage inside **this** repository (`gitwe.yaml`)

The workflow `.github/workflows/gitwe.yaml` **dogfoods** the Action:

```yaml
uses: ./ # → runs the local action.yaml
```

It does **not** use `.github/actions/setup` because the goal is to exercise the public Action itself (install + build + run commands).

### What `gitwe.yaml` does

1. Checks out the repo with full history (`fetch-depth: 0`).
2. Configures git identity and remote URL with `GITHUB_TOKEN`.
3. Ensures `main` and `develop` exist on the remote.
4. Runs:
   - `validate` (with `.gitwe/gitwe.yaml`)
   - `doctor` (best-effort)
   - `status`
   - `graph --root main`
5. On **pull requests** only, runs a safe demo:
   - `start feature ci-demo-<run_id>`
   - `finish … --dry-run`

All demo steps use `continue-on-error: true` so a failure does not block the rest of CI.

### When to change `gitwe.yaml`

| Goal                   | What to edit                                    |
| ---------------------- | ----------------------------------------------- |
| Test a new command     | Add another `uses: ./` step                     |
| Change config path     | `config:` input                                 |
| Disable demos          | Remove or guard the PR-only steps               |
| Require doctor to pass | Remove `continue-on-error` from the doctor step |

### Example: add a real finish step on tag

```yaml
- name: Finish release (on tag)
  if: startsWith(github.ref, 'refs/tags/v')
  uses: ./
  with:
    command: finish
    branch-name: ${{ github.ref_name }}
    push: true
    strategy: merge
```

---

## Differences: `action.yaml` vs `.github/actions/setup`

|           | `action.yaml` (root)                    | `.github/actions/setup`                 |
| --------- | --------------------------------------- | --------------------------------------- |
| Audience  | Any consumer of gitwe                   | Only this repo's CI                     |
| Purpose   | Run gitwe **commands**                  | Install Node + deps + build             |
| Used by   | External workflows + `gitwe.yaml`       | `test`, `ci`, `e2e`, `compatibility`, … |
| Reference | `uses: idmdakhi/gitwe@v1` or `uses: ./` | `uses: ./.github/actions/setup`         |

Do **not** mix them: CI jobs that only need Node/npm should use `setup`; jobs that need to execute gitwe CLI should use the root Action.

---

## Requirements

- The target repository must already be checked out (`actions/checkout`).
- For commands that need history (`graph`, finish with remote checks) use `fetch-depth: 0`.
- Node.js ≥ 20 (the Action installs it for you).
- Git ≥ 2.30 on the runner (GitHub-hosted runners satisfy this).

---

## Troubleshooting

| Symptom                         | Likely cause                                                                            | Fix                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `NotInitializedError`           | No workflow config in the repo                                                          | Run `gitwe init` or pass `config:`                                                                                           |
| Slow Action                     | Cold cache                                                                              | Second run is faster; cache key is `package-lock.json` of the Action                                                         |
| Permission denied on push       | Missing `contents: write`                                                               | Add `permissions: contents: write` to the job                                                                                |
| Wrong branch created            | `short-name` contains `/`                                                               | Use a simple name; prefix comes from the workflow definition                                                                 |
| `Unknown command`-style failure | Command isn't wired into the rewritten CLI yet (see the notice at the top of this page) | Use one of the nine commands in [commands.md](./commands.md), or run gitwe directly as in [using-in-ci.md](./using-in-ci.md) |
