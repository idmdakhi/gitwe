# Changelog

## [2.2.0] - 2025-07-25

### Added

- **`gitwe sync`**: Update all topic branches at once (`--rebase`, `--push`, `--all`).
- **Config Schema Validation**: Zod schema for rigorous workflow config checking.
- **GitHub Action**: New `dry-run` and `strategy` inputs for fine-grained CI control.
- **Result Pattern**: Introduced `Result<T, E>` for better error handling in core handlers.
- **ConfigService**: Centralized CLI settings (emoji, color, quiet, json).

### Changed

- **Internal Architecture**: Kernel modules now leverage `Result` for predictable error propagation.
- **Domain Events**: Enriched with `correlationId` and `causationId` for traceability.

### Fixed

- Edge case in `update` where rebasing on dirty working tree now throws a clear error.
- `ShellGitRepository` now captures `stdout` on failure for better conflict diagnostics.

### Deprecated

- Direct usage of `Container` handlers is deprecated in favor of `kernel.run()`.
