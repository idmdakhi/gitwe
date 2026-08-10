# RFC-0004: Machine-Readable Output & Schema

| Field         | Value             |
| ------------- | ----------------- |
| **Status**    | Draft             |
| **Date**      | 2026-08-01        |
| **Target**    | 1.1               |
| **Priority**  | High              |
| **Author(s)** | gitwe maintainers |
| **Related**   | —                 |

## Summary

Make every major gitwe command emit stable, versioned JSON (and YAML) suitable for CI, scripts and external tooling. Introduce an explicit `schemaVersion` field and publish JSON Schema documents.

## Motivation

- CI systems need reliable structured data (`overview`, `finish` result, list of branches, …).
- The current `--format json` on `overview` is a good start but lacks a schema version and is not consistent across commands.
- External tools (dashboards, bots, IDE extensions) cannot safely parse the output without a contract.

## Detailed Design

### Common envelope

Every machine-readable response follows the same top-level shape:

```json
{
  "schemaVersion": 1,
  "command": "overview",
  "ok": true,
  "data": {/* command-specific payload */},
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
    "message": "…",
    "hint": "…",
    "files": ["src/app.ts"]
  }
}
```

### Commands that gain full support

| Command               | Notes                                              |
| --------------------- | -------------------------------------------------- |
| `overview` / `status` | Already partially present; migrate to the envelope |
| `start`               | Return the created branch + start point            |
| `finish`              | Full `FinishResult` + any tags / updated branches  |
| `list` (per type)     | Array of `BranchStatus`                            |
| `doctor` (RFC-0003)   | List of findings                                   |
| `version`             | `{ "version": "1.0.0", "schemaVersion": 1 }`       |
| `config list`         | The normalised workflow definition                 |

Global flag:

```
--format text|json|yaml          # default text
```

(The existing `--json` on some paths becomes an alias for `--format json`.)

### Schema documents

Published under `docs/schemas/`:

- `overview.v1.json`
- `finish.v1.json`
- `doctor.v1.json`
- …

A simple `$id` and `$schema` make them usable by ordinary JSON-Schema validators.

### Layer impact

| Layer            | Changes                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `cli/output.ts`  | Central helpers `printJson`, `printYaml`, envelope builder              |
| `cli/commands/*` | Every action that currently prints free-form text gains a format branch |
| `application`    | No change – the engine already returns structured objects               |
| docs             | New `docs/schemas/` + reference in `commands.md`                        |
| tests            | Snapshot tests for the JSON shape of each command                       |

### Backward compatibility

- Human-readable (text) output stays the default and is unchanged.
- Existing `overview --format json` is upgraded to the new envelope; a short deprecation note is added for one minor release if the raw shape was being scraped.

## Alternatives Considered

1. **Keep ad-hoc JSON per command**  
   Rejected – tooling writers hate special-casing.

2. **Only support JSON, drop YAML**  
   YAML is already a dependency (`js-yaml`) and is convenient for humans inspecting CI logs.

3. **Protobuf / MessagePack**  
   Overkill for a CLI tool; JSON + Schema is the pragmatic choice.

## Acceptance Criteria

- [ ] Every listed command accepts `--format json` and `--format yaml`.
- [ ] Every successful JSON response contains `"schemaVersion": 1`.
- [ ] Error responses use the
      ...
