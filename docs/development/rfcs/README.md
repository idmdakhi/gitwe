# gitwe RFCs

Design proposals for larger gitwe features. For where these fit into overall
priorities, see the [roadmap](../roadmap.md).

## Process

1. Open an issue or discussion describing the problem.
2. Write an RFC in this directory following the template below.
3. Number RFCs sequentially (`0001`, `0002`, ...).
4. Discuss on GitHub Discussions / the PR.
5. Once accepted, implement and link the PR back to the RFC, and update its
   status.

## Status meanings

| Status | Meaning |
| --- | --- |
| Draft | under discussion |
| Accepted | approved, ready for implementation |
| Implemented | shipped in a released version |
| Rejected | will not be implemented (with reason) |
| Superseded | replaced by a later RFC |

## Index

| RFC | Title | Status | Target |
| --- | --- | --- | --- |
| [0001](./0001-multi-remote.md) | Multi-Remote & Remote Strategy | Implemented | 1.2 |
| [0002](./0002-finish-strategies.md) | New Finish Strategies (Cherry-pick & Rebase-and-Merge) | Draft | 1.2 |
| [0003](./0003-doctor-auto-repair.md) | Doctor & Auto-Repair | Implemented | 1.1 |
| [0004](./0004-machine-readable-output.md) | Machine-Readable Output & Schema | Implemented | 1.1 |

Statuses above were verified against the current source while rewriting the
docs (see the [roadmap](../roadmap.md) for what "implemented" does and
doesn't cover for each) — 0001, 0003, and 0004 had been sitting at "Draft"
despite being functionally complete.

## Template

See any existing RFC for the expected structure:

- Metadata (Status, Date, Target version, Priority)
- Summary
- Motivation
- Detailed design
- Layer impact
- Alternatives
- Acceptance criteria
- Risks & open questions
