# Glossary

Definitions of key terms used in gitwe.

| Term | Definition |
| :--- | :--- |
| **Base Branch** | A long-lived branch (e.g., `main`, `develop`). Workflows are built around them. |
| **Topic Branch** | A short-lived branch for a specific task (e.g., `feature/login`, `hotfix/1.2.1`). |
| **Preset** | A pre-defined workflow configuration (e.g., `classic`, `github`, `gitlab`). |
| **Workflow Definition** | The `.gitwe/gitwe.yaml` file that defines branch types and rules. |
| **Engine** | The core orchestrator that executes the workflow logic. |
| **Use Case** | A specific operation (e.g., `StartBranchUseCase`, `FinishBranchUseCase`) located in the `application` layer. |
| **Schema Version** | The version number inside the workflow file (`schemaVersion: 1`) that ensures backward compatibility. |
| **Resumable Operation** | An operation (like `finish`) that can be paused on conflict and resumed with `--continue`. |
| **Strategy** | The merge method used during `finish` (`merge`, `squash`, `rebase`, etc.). |
| **State File** | `.gitwe/state.json` – persists the context of an in-progress operation. |
| **Remote** | A remote Git repository (origin, upstream). |
| **Hook** | An executable script triggered at a specific lifecycle event. |
| **Upstream** | The remote tracking branch for a local branch. |
| **Dry Run** | A simulation mode (`--dry-run`) that shows what would happen without executing changes. |
