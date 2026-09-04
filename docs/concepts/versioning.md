# Versioning and Changelog

gitwe can automatically bump versions, create Git tags, and generate changelogs based on your workflow definition.

## Enabling Versioning

In `.gitwe/gitwe.yaml`:

```yaml
versioning:
  enabled: true
  files:
    - package.json
    - Cargo.toml
  tagFormat: "v{{version}}"
  bumpRules:
    - type: release
      bump: minor
    - type: hotfix
      bump: patch
```

## Fields

| Field | Description |
| :--- | :--- |
| `enabled` | Set to `true` to activate automatic versioning. |
| `files` | List of file paths to update (currently supports `package.json`, `Cargo.toml`, and plain text files with `version =`). |
| `tagFormat` | Template string. `{{version}}` is replaced with the bumped version. E.g., `v1.2.3`. You can also use `{{name}}` for branch names. |
| `bumpRules` | Maps branch types to semantic version increments (`major`, `minor`, `patch`, `prerelease`). |

## Semantic Version Rules

- **Major:** Breaking changes (usually `release` branches).
- **Minor:** New features (usually `feature` branches if merged directly to `main`).
- **Patch:** Bug fixes (usually `hotfix` branches).
- **Prerelease:** Alpha/Beta versions (e.g., `1.0.0-alpha.1`).

## Changelog Generation

gitwe integrates with `cliff.toml` (or custom templates) to generate changelogs.

To generate a changelog manually:

```bash
gitwe changelog generate
```

This reads the commit history since the last tag and creates a `CHANGELOG.md` entry.

## Example Workflow

1. You finish a `release/1.2.0` branch.
2. `versioning.bumpRules` says `release` → `minor`.
3. The current version is `1.1.0`.
4. gitwe bumps `package.json` to `1.2.0`.
5. gitwe creates a Git tag `v1.2.0`.
6. (Optional) gitwe pushes the tag if `--push` is used.

## Prerelease Management

For `prerelease` bumps, gitwe adds a suffix like `-alpha.1`, `-beta.2`. The increment is handled automatically based on the existing version string.
