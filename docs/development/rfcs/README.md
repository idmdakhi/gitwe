# gitwe RFCs

This directory contains Request for Comments (RFC) documents for proposed changes to **gitwe**.

## Process

1. Open an issue or discussion describing the problem.
2. Write an RFC in this directory following the template.
3. Number RFCs sequentially (`0001`, `0002`, …).
4. Discuss on GitHub Discussions / PR.
5. Once accepted, implement and link the PR back to the RFC.

## Status meanings

| Status      | Meaning                               |
| ----------- | ------------------------------------- |
| Draft       | Under discussion                      |
| Accepted    | Approved, ready for implementation    |
| Implemented | Shipped in a released version         |
| Rejected    | Will not be implemented (with reason) |
| Superseded  | Replaced by a later RFC               |

## Index

| RFC                                       | Title                                                  | Status | Target |
| ----------------------------------------- | ------------------------------------------------------ | ------ | ------ |
| [0001](./0001-multi-remote.md)            | Multi-Remote & Remote Strategy                         | Draft  | 1.2    |
| [0002](./0002-finish-strategies.md)       | New Finish Strategies (Cherry-pick & Rebase-and-Merge) | Draft  | 1.2    |
| [0003](./0003-doctor-auto-repair.md)      | Doctor & Auto-Repair                                   | Draft  | 1.1    |
| [0004](./0004-machine-readable-output.md) | Machine-Readable Output & Schema                       | Draft  | 1.1    |

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
