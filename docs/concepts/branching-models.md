# Branching Models

gitwe is workflow-agnostic. It ships with several presets to get you started, but you can fully customize the `.gitwe/gitwe.yaml` file to match any Git branching strategy.

## Available Presets

### 1. Classic (Git Flow)

This is the traditional `nvie/gitflow` model.

```yaml
baseBranches:
  - main
  - develop
branchTypes:
  - feature   (extends: develop, target: develop)
  - release   (extends: develop, target: main)
  - hotfix    (extends: main, target: main)
```

**Best for:** Projects with regular release cycles and multiple environments.

### 2. GitHub Flow

A simpler, continuous delivery model.

```yaml
baseBranches:
  - main
branchTypes:
  - feature   (extends: main, target: main)
```

**Best for:** Web applications, SaaS products, and teams practicing continuous deployment.

### 3. GitLab Flow

Includes environment branches (e.g., `staging`, `production`).

```yaml
baseBranches:
  - main
  - staging
  - production
branchTypes:
  - feature   (extends: main, target: main)
```

**Best for:** Projects using GitLab's CI/CD and environment-specific deployments.

## Custom Models

You are not limited to these presets. You can define any number of base branches and topic types.

**Example: Monorepo with multiple releases**

```yaml
baseBranches:
  - name: main
  - name: stable/v1
  - name: stable/v2

branchTypes:
  - name: patch
    extends: stable/v1
    target: stable/v1
    prefix: patch/
  - name: feature
    extends: main
    target: main
    prefix: feature/
  - name: security
    extends: main
    target: main
    prefix: security/
```

## Choosing the Right Model

| Use Case | Recommended Preset |
| :--- | :--- |
| Open-source library with versioned releases | Classic (Git Flow) |
| Web app / SaaS with daily deployments | GitHub Flow |
| Enterprise with strict staging/production gates | GitLab Flow |
| Legacy system with multiple maintenance branches | Custom (e.g., multiple `stable/` branches) |

## Migration Tip

If you are migrating from `git-flow-avh` with custom prefixes, simply map your `[gitflow "prefix"]` entries to the `branchTypes` entries in gitwe. The `extends` and `target` fields replace the `master`/`develop` defaults.
