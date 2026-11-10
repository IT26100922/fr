# Backend simplification: dependency and impact review

Status: proposal only, 2026-11-02. No backend features, routes, tables or tests were removed in this refinement. Private messaging remains enabled. A group-only scope has not been confirmed.

## Essential implementation to retain

| Area | Existing dependencies | University / workflow purpose |
|---|---|---|
| Authentication and sessions | `AuthService`, `UserDAO`, `User` subclasses, shared controllers | Registration/login/logout, suspension checks and server-enforced roles; dashboard runtime polymorphism |
| Profiles and questionnaire | `ProfileService`, `UserDAO`, `QuestionnaireResponse`, photo classes | Profile update, stored preferences, encapsulation, optional member-owned photo CRUD |
| Matching | `MatchingService`, `User`, `QuestionnaireResponse`, connection-aware `UserDAO` reads | Deterministic Java scoring; factor explanations; excludes prior friendship pairs |
| Friendships | `FriendService`, `FriendDAO`, request model and pair constraints | Create/read/update/delete lifecycle and access to conversations |
| Communities | `CommunityService`, `CommunityDAO`, membership model | Browse/join/leave; leader assignment; active/archived states |
| Publishing | `PostService`, `PostDAO`, `Post`, `Approvable` | Pending creation, author status, assigned-leader moderation, self-review prevention and approved-only comments |
| Conversations | `MessageService`, `MessageDAO`, `Conversation` subclasses | Group/private participation, persisted messages and runtime display-name polymorphism |
| Administration | `AdminService`, user/community DAOs | Suspension/reactivation, community CRUD/archiving, leader assignment; excludes private-message access |
| Persistence / transport | `Jdbc`, `DatabaseConnection`, configuration, controllers, PostgreSQL schema/migration | Prepared statements, transactions, validation and HTTP translation; no new framework needed |

## Candidates and approval boundaries

| Candidate | Dependency chain and impact | Recommendation / approval needed |
|---|---|---|
| Repeated dashboard report UI | Admin home → `/api/admin/dashboard` → `ReportService.dashboard` → `DailyReport`; full report also available at `/admin/reports.html` | Frontend repetition removed in this refinement. Reports and API response remain available. No backend removal was needed. |
| Eager report generation on admin home | `ReportService.dashboard` calculates report counts and two activity rankings even when the simplified home renders only totals. Integration tests read `data.report`. | Possible later change: separate totals from report retrieval and update the API contract, integration checks and documentation together. Needs explicit approval; current response preserved. |
| “Most active” rankings | `DailyReport.generateReport` runs user/community aggregate queries over `activity_logs`; `reportView` displays them; API exposes both result keys | Could reduce the report UI to a compact count table, or remove rankings from the API if approved. Check report/domain coverage and rubric first. Counts and date boundaries must remain correct. |
| Activity analytics / event storage | Auth/profile/friend/community/post/message/admin/photo mutations log through `ActivityDAO` inside transactions. `DailyReport` and `/api/admin/activity` read the same table. The DAO returns events and identity metadata, never message bodies. | Removing the table is high impact: service transactions, reports, schema, seeded data, audit SQL, privacy tests and documentation all depend on it. Prefer retaining the simple append-only log. Do not remove writes or storage without approval and an additive migration plan. |
| `ReportService` wrapper | Controller calls → role check in service → `Reportable` / `DailyReport`; dashboard also uses report service | Small but meaningful role boundary and viva explanation. Inlining saves little and can duplicate permission checks. Retain unless an approved scope change removes reporting. |
| Private conversations | Friends/profile Message buttons → `/api/conversations/private` → accepted-friend validation → `PrivateConversation`; shared message APIs and conversation schema cover both types | Group-only scope needs explicit confirmation. Hiding a tab does not revoke API access. Any removal must address navigation, routes, models, existing message history, pair constraints, tests and replacement polymorphism evidence. Preserve all existing history. |
| Feature flag | `features.privateMessaging` gates member buttons and conversation filtering; it does not change Java permissions | One explicit switch is understandable. Keep while private/group scope is undecided; avoid adding a larger feature framework. |
| Frontend state | Discovery filter state, questionnaire step answers, selected chat, polling signature and per-conversation drafts | These protect back navigation, filtering and unsent messages. Removing them can lose user data or cause duplicate requests. Shorter copy and smaller page headings achieve visual simplicity without changing them. |
| DAO/profile overloads and helpers | Matching reuses a connection and questionnaire; JSON and photo controllers share auth/session/origin parsing | These reduce duplicated rules and demonstrate method/constructor overloading. Retain; do not equate a small method with redundant behavior. |

## Required checks for an approved future change

Before implementation, agree on the API fields/routes and historical data policy being changed. Preserve the current model → DAO → service → controller separation where it enforces a responsibility. Keep `User` inheritance, conversation/dashboard runtime polymorphism, `Approvable`/`Reportable` interfaces, constructor/method overloads and at least three concrete CRUD demonstrations. If a reporting or conversation example is removed, identify an equally clear remaining OOP example before editing.

Run compilation, domain/photo checks, PostgreSQL integration, photo security, SQL preparation/constraints, HTTP boundaries, discovery filters, syntax/assets/docs and member/leader/admin browser checks. Existing tests remain; only wording expectations change when visible labels intentionally change. A later API removal requires revised assertions with equivalent permission/persistence coverage, not silent deletion of tests.

No destructive database migration, backend removal or private-messaging scope change is approved or implemented here.
