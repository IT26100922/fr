# Implementation checklist

PostgreSQL-only project; verified with PostgreSQL 18 and Java 21-compatible bytecode on 2026-11-01.

- [x] Foundation: centralized configuration, HTTP server, build/run scripts, design tokens
- [x] Database: normalized schema and repeatable demonstration seed (PostgreSQL schema and repeated seed verified)
- [x] Domain: encapsulation, validation, role and conversation inheritance, interfaces
- [x] Persistence implementation: prepared JDBC statements and transaction support
- [x] Services/API implementation: authentication and server-side access rules
- [x] Onboarding and weighted matching implementation
- [x] Friend requests and friendship lifecycle implementation
- [x] Communities, moderated posts, comments implementation
- [x] Private and group conversations with polling implementation
- [x] Administration and daily activity reports implementation
- [x] Responsive frontend, accessible forms, native cursor and reduced motion
- [x] Compilation, 286 domain checks, PostgreSQL SQL/constraint audit, and 120 HTTP integration checks
- [x] README, diagrams, API reference, test evidence
- [x] PostgreSQL JDBC driver available for runtime verification (ignored JAR in backend/lib)
- [x] Real PostgreSQL HTTP integration suite executed, including UTC daily reports
- [x] Authenticated browser workflow/console checks executed against real APIs

Checked implementation items indicate code exists; they do not claim unexecuted workflows have passed. Authenticated browser workflows now pass for all three roles; see [testing](testing.md).

- [x] Local licensed photography and responsive image fallbacks
- [x] Tested profile-photo upload/replacement/removal and additive migration
- [x] Discovery filters, factor explanations and rejected-pair exclusion
- [x] Author-only post submission feedback
