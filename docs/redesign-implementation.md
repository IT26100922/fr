# Student platform redesign: implementation record

## Audit and boundaries

The inspected application has a JDK HttpServer, 14 PostgreSQL tables, prepared JDBC DAOs, Java services/models, 17 HTML pages, four JavaScript modules, a shared stylesheet, and one favicon. Existing member, leader, and administrator workflows are real APIs. Matching, request state, moderation, chat participation, and role decisions belong in Java.

The reference review used [Boo's public home](https://boo.world/), [matching](https://boo.world/match), [technology community](https://boo.world/u/technology), and [FAQ](https://boo.world/faq): useful ideas are interest-led navigation, filtered profile discovery, and conversations alongside community content. Its artwork, branding, personality test, dating behavior, member imagery, and statistics are not reused.

## University architecture confirmation

The existing implementation uses plain Java 21-compatible source, JDK HttpServer, JDBC, and PostgreSQL rather than JSP/Servlets. The supplied SE1020 wording mentions file/SQL storage and JSP/Servlets in a sample contribution section. The lecturer should confirm whether that sample is compulsory for this team's assessment. This redesign preserves the existing stack; no framework or Servlet migration is authorized or planned. This question does not block improvements inside the approved stack.

## File-by-file plan

| Phase | Files | Work and verification |
|---|---|---|
| A: baseline | Existing Java/domain/API/schema/browser tests | Record baseline results against a new disposable database, preserving the running demo database |
| B: foundation | `frontend/assets/css/style.css`, `common.js`, new `images.js`, local assets/manifest | Light/dark tokens, local font, native cursor, shared photo/avatar fallbacks, accessible focus/loading states |
| C: public/onboarding | `index.html`, `login.html`, `register.html`, `landing.js`, `auth.js`, questionnaire in `app.js` | Photo-led landing, truthful public community projection, password visibility, selected-interest handoff, five existing steps |
| D: people | `app.js`, new discovery/settings pages, `MatchingService`, `UserDAO` | Responsive discovery/filter/focus view, factor breakdown from one scoring implementation, all request pairs excluded, safe state feedback |
| E: communities | `app.js`, new feed page, `CommunityDAO`, `PostDAO`, `ApiController` | Covers/counts/directory, approved social feed, comments and ownership-scoped submission status; retain moderation rules |
| F: messaging | `app.js`, `MessageDAO`, `MessageService` | Participant avatars, clear private/group navigation, draft/error states and four-second polling; preserve existing APIs |
| G: uploads | Versioned PostgreSQL migration, new photo DAO/service/controller, `Main`, profile UI | Member-owned optional uploads, bounded decode/re-encode, controlled storage, replacement/removal, metadata, authenticated reads; dedicated tests |
| H: administration | Shared styles and existing admin functions | Readable tables/forms, confirmation feedback, no permission expansion or decorative photo density |
| I: verification/docs | Domain/API/photo/browser tests, README, API/architecture/ER/class docs, CHANGELOG, viva/report/contribution guides | Real tests at 390/768/1024/1440, member/leader/admin journeys, console checks, honest evidence and outstanding decisions |

## Persistent and API changes

The visual shell, filters over the existing bounded candidate list, settings theme, and existing workflows need no new domain fields. Public community previews expose only approved directory metadata, never members or pending posts. Match factor data is derived in Java from the existing formula. Author submission status requires a user-scoped query.

Profile photos require a new metadata table through a versioned migration, a photo DAO/service, authenticated upload/remove/read routes, controlled storage outside the frontend, and dedicated security tests. No existing table or user data is dropped. The original fresh schema is not rerun as an upgrade.

## Review policy

The user authorized publication as three pull requests: backend/database, frontend experience, and verification/documentation. Review and merge them in that order; the later PRs target the preceding branch to keep each diff focused. Opening these PRs does not merge the implementation into main.

## Verification record

Baseline: 286 domain, 110 HTTP/PostgreSQL, 64 SQL preparation, six constraint, 33 HTTP boundary and 18 original public browser checks passed before changes. Final: 286 domain, 15 photo processing, 120 HTTP/PostgreSQL, 42 photo security, 71 SQL preparation, six constraint, 74 HTTP boundary, six filter and 120 browser checks pass. JavaScript syntax and local asset inventory pass. Detailed scenarios and reproduction are in [testing](testing.md).

## Completion evidence

Phases B–I are implemented. Baseline and final checks passed; see [testing](testing.md) and [change history](../CHANGELOG.md). Remaining decisions are lecturer stack confirmation, leader-authored post review policy, real team assignments, and deployment backup/monitoring/load work. Publication is authorized as three reviewable PRs; merging remains a separate action.
