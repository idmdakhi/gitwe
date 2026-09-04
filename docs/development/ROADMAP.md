
# Roadmap

This page summarizes the high-level priorities for gitwe development.
For the full checklist, see the [TODO.md](../../TODO.md) file.

---

## P0 – Immediate (1.0.x / early 1.1)
*Blocker fixes and critical hygiene.*

- **Architecture Boundary Audit:** Enforce `domain`/`application` → no import of `infrastructure`.
  - [x] P0.1-A: Dependency audit (found `InitWorkflowUseCase` violation).
  - [ ] P0.1-B/C: Duplicate Preset audit and legacy checks.
  - [ ] P0.1-F: Add lint rule or CI check.
- **CI/Release:** Re-enable disabled workflows, fix `action.yaml` entrypoint, align E2E tests.
- **CLI Output:** Add `schemaVersion: 1` to JSON; support `--format json|yaml|table`.
- **Error Experience:** Improve hint strings and conflict error messages.

---

## P1 – 1.1 (Developer Experience & Stability)
*High-value features for users.*

- **Doctor Command:** Implement `gitwe doctor` (report) and `doctor --fix` (RFC-0003).
- **Overview/Status:** Add `--format table`, show ahead/behind, warn about `state.json`.
- **Testing:** Expand E2E for conflict scenarios; add snapshot tests.
- **Documentation:** Write state-machine diagram (see [concepts/state-machine.md](../concepts/state-machine.md)).
- **Small Features:** `gitwe version --json`, optional `tagFormat`, `gitwe config validate`.

---

## P2 – 1.2 (Advanced Capabilities)
*Feature parity and advanced workflows.*

- **Multiple Remotes (RFC-0001):** Support `remote` object in workflow, `--remote`/`--push-to` flags.
- **New Finish Strategies (RFC-0002):** Add `cherry-pick` and `rebase-merge` strategies.
- **Parity with git-flow-next / AVH:**
  - [ ] Wire up `track` and `rename` commands.
  - [ ] Add `allowDirty`, `--keep`, signed commits/tags.
  - [ ] Validate custom `base` in `start`.
- **Versioning/Changelog:** Enable `cliff.toml` integration; improve prerelease handling.

---

## P3 – 1.3 and Beyond (Integration & Future)
*Long-term vision.*

- Official GitHub Action (reusable, matrix examples).
- Basic VS Code extension.
- Monorepo support (workflows in subdirectories).
- Publish JSON Schema to Schema Store.
- Structured I/O for hooks (v2.0).
- Lightweight strategy scripts (v2.0).

---

## Current Status

The team is actively working on **P0** and **P1** items.
If you are contributing, please focus on open P0 or P1 items first, and always check the [TODO.md](../../TODO.md) for the latest per-file checkboxes.
