# Using gitwe in CI

This page shows copy-pasteable snippets for running gitwe inside GitHub Actions and GitLab CI.

gitwe is designed to be CI-friendly:

- Exit code `0` = success
- Exit code `1` = error
- Exit code `2` = merge/rebase conflict (resume with `--continue` or abort with `--abort`)
- Machine-readable output via `--format json` / `--format yaml` (includes `schemaVersion: 1`)

---

## GitHub Actions

### 1. Use the official Action (recommended)

```yaml
name: Feature workflow

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  gitwe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Doctor (optional health check)
        uses: idmdakhi/gitwe@v1
        with:
          command: doctor
        continue-on-error: true

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

### 2. Finish on merge to main

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

### 3. Validate config + dry-run

```yaml
- name: Validate workflow
  uses: idmdakhi/gitwe@v1
  with:
    command: validate
    config: .gitwe/gitwe.yaml

- name: Finish dry-run
  uses: idmdakhi/gitwe@v1
  with:
    command: finish
    branch-name: feature/login
    dry-run: true
```

### 4. Capture machine-readable output

```yaml
- name: Overview (JSON)
  id: overview
  uses: idmdakhi/gitwe@v1
  with:
    command: status
    # the Action always passes --json internally; result is in outputs

- name: Print result
  run: echo '${{ steps.overview.outputs.result-json }}'
```

### 5. Local install (without the Action)

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0

- uses: actions/setup-node@v4
  with:
    node-version: "22"
    cache: npm

- run: npm install -g gitwe # or: npm ci && npm run build

- run: gitwe doctor
- run: gitwe status --format json
- run: gitwe start feature ci-demo
```

---

## GitLab CI

```yaml
stages:
  - workflow

gitwe:
  stage: workflow
  image: node:22
  variables:
    GIT_DEPTH: 0
  before_script:
    - npm install -g gitwe
    - git config --global user.email "ci@example.com"
    - git config --global user.name "CI"
  script:
    - gitwe doctor || true
    - gitwe status --format json
    - gitwe validate
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

### Finish on protected branch (example)

```yaml
finish:
  stage: workflow
  image: node:22
  script:
    - npm install -g gitwe
    - gitwe finish "$CI_COMMIT_REF_NAME" --push --strategy squash
  only:
    - main
```

---

## Tips

| Tip          | Detail                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| Full history | Always use `fetch-depth: 0` (GitHub) or `GIT_DEPTH: 0` (GitLab) so merge-base and ahead/behind work.          |
| Identity     | Set `user.name` / `user.email` (and disable GPG signing if needed).                                           |
| Conflicts    | Exit code `2` means a conflict; the Action / job can decide whether to fail or notify.                        |
| Config       | Pass `--config path/to/gitwe.yaml` or set `GITWE_CONFIG`.                                                     |
| Safety       | Prefer `--dry-run` in exploratory jobs; use `--force` only when you intentionally skip the remote-sync check. |

---

## Related

- [Command reference](./commands.md)
- [GitHub Action details](./github-action.md)
- [Workflow definition](./workflow-definition.md)
- [RFC-0003 Doctor](./development/rfcs/0003-doctor-auto-repair.md)
- [RFC-0004 Machine-readable output](./development/rfcs/0004-machine-readable-output.md)s
