# RFC-0004: Machine-Readable Output & Schema

| Field | Value |
| --- | --- |
| **Status** | Implemented (schema documents still outstanding — see below) |
| **Target** | 1.1 |
| **Priority** | High |

## Summary

Every gitwe command emits stable, versioned JSON (and YAML) suitable for CI,
scripts, and external tooling, through an explicit `schemaVersion` field and
a consistent envelope.

## Motivation

- CI systems need reliable structured data (`overview`, a `finish` result, a
  list of branches, ...).
- Ad-hoc JSON on a couple of commands isn't enough — external tools
  (dashboards, bots, IDE extensions) can't safely parse output without a
  contract that's consistent across every command.

## Design (as implemented)

### Common envelope

```json
{
  "schemaVersion": 1,
  "command": "overview",
  "ok": true,
  "data": { "...": "command-specific payload" },
  "warnings": [],
  "error": null
}
```

On failure:

```json
{
  "schemaVersion": 1,
  "command": "finish",
  "ok": false,
  "data": null,
  "warnings": [],
  "error": {
    "code": "CONFLICT",
    "message": "...",
    "hint": "...",
    "files": ["src/app.ts"]
  }
}
```

### Global flag

```
--format text | json | yaml | table
```

`text` is the default. `table` is accepted everywhere but currently renders
the same as `text` — see the [roadmap](../roadmap.md#p1--11-stability--dx).

### Where it lives

`src/cli/output.ts` implements the envelope builder and the `CommandOutput`
facade (`out.ok()`/`out.fail()`/`out.note()`/`out.warn()`) that every command
in `src/cli/commands/` uses, so `--format json|yaml` behaves consistently
without individual commands branching on format themselves. See
["CLI"](../../architecture/overview.md#cli) in the architecture overview.

### Backward compatibility

Human-readable (`text`) output is unchanged and remains the default.

## Still outstanding

- **Published JSON Schema documents** (`docs/schemas/*.v1.json`) — not yet
  written. The envelope shape above is stable, but there's no
  machine-checkable schema file yet for tooling to validate against.
- **`--format table`** doesn't have its own renderer yet (falls back to
  `text`).

## Alternatives considered

1. **Ad-hoc JSON per command.** Rejected — tooling authors have to
   special-case every command instead of parsing one envelope shape.
2. **JSON only, no YAML.** `js-yaml` was already a dependency, and YAML is
   more convenient than JSON for a human skimming CI logs.
3. **Protobuf/MessagePack.** Overkill for a CLI tool; JSON (+ eventually a
   published schema) is the pragmatic choice.
