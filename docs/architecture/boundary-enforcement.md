# Boundary Enforcement

gitwe follows **Clean Architecture** principles. The core rule (defined in `ARCHITECTURE.md`) is:

> **Domain and Application layers MUST NOT import Infrastructure.**

## The Rule

```text
┌─────────────────┐
│   Presentation  │ (CLI)
│      (CLI)      │
└────────┬────────┘
         │ depends on
┌────────▼────────┐
│   Application   │  ←─ Use Cases
└────────┬────────┘
         │ depends on
┌────────▼────────┐
│     Domain      │  ←─ Entities, Value Objects, Errors
└─────────────────┘
         ▲
         │ depends on
┌────────┴────────┐
│ Infrastructure  │  ←─ Git adapters, File I/O, Config parsers
└─────────────────┘
```

**Allowed imports:**
- `cli` → `application`
- `application` → `domain`
- `infrastructure` → `domain`
- `infrastructure` → `application` (only via interfaces / dependency injection)

**Forbidden imports:**
- `domain` → `infrastructure`
- `application` → `infrastructure`

## Why It Matters

- **Testability:** Domain logic can be unit-tested without mocking file systems or Git commands.
- **Maintainability:** Replacing the Git implementation (e.g., from shell to Node.js `child_process`) does not affect business logic.
- **Clarity:** It prevents tight coupling and circular dependencies.

## How We Enforce It (P0.1-F)

As of `1.0.0`, this rule was only enforced by human review. A live violation was found in `InitWorkflowUseCase` importing `domain/config/presets` (which was actually a misplacement).

### Enforcement Mechanism

1. **ESLint Rule:**
   We added a custom ESLint plugin/rule that scans for `import` statements containing `../infrastructure` or `src/infrastructure` within `src/domain` and `src/application`.

2. **CI Script:**
   A shell script runs before the build in CI:

   ```bash
   npm run lint:boundaries
   ```

   If it finds violations, the build fails.

### The Script

Located in `scripts/check-boundaries.sh`:

```bash
#!/bin/bash
# Fail if domain/application imports infrastructure
grep -r "from.*infrastructure" src/domain && exit 1
grep -r "from.*infrastructure" src/application && exit 1
echo "Boundaries OK"
```

## Current Status (as of 1.0.1)

| Boundary | Status | Action |
| :--- | :--- | :--- |
| `domain` → `infrastructure` | ✅ Clean | No violations found. |
| `application` → `infrastructure` | ✅ Clean | Fixed in 1.0.1 (moved Preset import). |
| `cli` → `application` | ✅ Allowed | OK. |
| `infrastructure` → `domain` | ✅ Allowed | OK. |
