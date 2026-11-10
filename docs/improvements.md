# Improvement plan

This is a proposed backlog based on the current implementation, not a list of delivered features or a claim that the passing tests failed. Priorities reflect verification gaps and limits visible in the code. See [testing](testing.md) for completed checks and [change history](../CHANGELOG.md) for delivered work.

For the photo brief and a more personal, interactive interface, see the [natural experience plan](natural-experience-plan.md). It separates visual changes from new functionality requiring backend work.

## Priority 1 — Verification and workflow clarity

| Improvement | Current observation | Completion criteria |
|---|---|---|
| Maintain authenticated browser coverage | Redesign browser suites exercise public and member workflows; the complete role suite and current results are recorded in testing.md | Keep these checks in regression runs and add tests for future workflows |
| Automate PostgreSQL verification | Build and test scripts exist, but the repository has no committed CI workflow to reproduce the full verification | A clean checkout can compile, run domain checks, create a disposable PostgreSQL database, load schema/seed twice, run the audit, and pass API tests with a documented JDBC dependency |
| Resolve leader-authored pending posts | A leader cannot self-moderate and there is no second-reviewer or delegation flow | Define an authorized alternative reviewer, preserve self-moderation prevention, and verify both allowed and denied paths |
| Rejected request policy (implemented) | All existing request pairs, including rejected pairs, are excluded from suggestions; repeated requests remain blocked | Preserve both-direction exclusion tests; a future retry policy needs explicit product approval |

## Priority 2 — Data access and maintainability

| Improvement | Current observation | Completion criteria |
|---|---|---|
| Add pagination and older chat history | Candidates are capped at 200; searches/feeds at 100; activity at 200; only the latest 200 messages load | Add bounded page/cursor parameters, stable ordering, and UI controls; demonstrate no duplicated or skipped rows across pages |
| Further batch recommendation queries | Connection reuse and questionnaire reuse are implemented, but profile reads still run per candidate | Batch remaining reads and measure query counts on a representative dataset; preserve matching results |
| Manage connections under load | Connections are opened through `DriverManager`; the server uses a fixed worker pool without a database connection pool | Measure concurrent workflows, define connection/time-out limits, and introduce pooling if measurements justify it |
| Extend versioned migrations | Migration 001 adds photo metadata and a ledger without rerunning the fresh schema | Use new numbered migrations for future changes and test upgrades with existing data |
| Make username case policy explicit | Usernames use PostgreSQL case-sensitive comparison/uniqueness, while Java normalizes email before storage | Document the intended login/uniqueness behavior and test case variants; if changing policy, handle existing duplicates before adding constraints |
| Improve startup diagnostics | Missing JDBC configuration can leave pages working while database APIs fail; `/api/health` checks connectivity | Show actionable startup/health diagnostics without disclosing credentials and document the steps to resolve them |

## Priority 3 — Product extensions

| Improvement | Current observation | Completion criteria |
|---|---|---|
| Manage existing groups | Participants are fixed after creation | Define creator/member permissions for inviting, leaving, and removal; preserve message-history access rules and test outsiders |
| Improve message delivery experience | Chat polls every four seconds and retrieves a bounded history | Evaluate incremental fetches and retry states first; add alternative delivery only if it improves measured behavior and remains understandable |
| Explain matches in the UI | The scoring formula is documented, but the recommendation experience can explain why people match more clearly | Show the factor breakdown and relevant shared preferences using the same backend calculation |
| Add content and account feedback paths | Current administration focuses on suspension, communities, and activity; no member reporting or appeal workflow is implemented | Define report/appeal states and reviewer permissions, expose clear status feedback, and verify privacy boundaries |

## Before hosting beyond the local demo

The server currently binds to loopback and uses local HTTP. Deployment requires a separate implementation and verification effort:

- Add HTTPS deployment configuration and Secure session cookies, with environment-specific settings.
- Decide whether sessions should survive restarts and how logout/expiry work across multiple server processes.
- Define password recovery, login abuse controls, and account recovery behavior.
- Use a dedicated PostgreSQL application role, protect configuration, and verify backup/restore procedures.
- Add operational logs and health monitoring that exclude credentials and private message bodies.

These items describe work needed for a hosted version; they are not requirements to run the current academic demo locally.

## Keeping the backlog useful

Select one item, define its expected behavior, implement it, and add verification appropriate to the change. Move completed work to [CHANGELOG.md](../CHANGELOG.md), update the [implementation checklist](implementation-checklist.md), and record executed results in [testing](testing.md). Keep unverified work clearly marked.
