# Testing and verification

Re-executed locally on 2026-11-02 for the student community refinement using Java 21-compatible bytecode, PostgreSQL 18, pgJDBC 42.7.8, Node 22+ and Chrome. Workflow tests use real Java APIs and PostgreSQL. The original baseline passed before implementation.

| Suite | Executed result | Task |
|---|---|---|
| Java compilation and domain | 286 pass | domain |
| Photo processing | 15 pass | domain |
| HTTP/PostgreSQL workflows | 120 pass | api |
| Photo HTTP/security | 42 pass | uploads |
| SQL preparation and constraints | 71 statements prepare; six constraint rejections pass | audit |
| HTTP/static boundaries | 74 pass | smoke |
| Discovery filters | Six pass | unit |
| Frontend syntax | All modules pass | syntax |
| Local images/font | 14 source records and responsive variants pass | assets |
| Public browser | 35 pass | public |
| Discovery browser | 20 pass | member |
| Community/feed browser | 12 pass | community-browser |
| Messaging browser | 10 pass | message-browser |
| Photo/profile browser | 10 pass | photo-browser |
| Member/Leader/Admin walkthrough | 33 pass | browser |
| Exact landing / all-page responsive / UI states | 203 pass | `npm run test:humanized` |

Run a task with `python tools/project_checks.py TASK`. Browser suites run sequentially against a dedicated Chrome debugging profile on port 9222. They check 390, 768, 1024 and 1440px widths, overflow, persisted actions and unexpected page console errors. The complete role walkthrough creates a member, saves all five questionnaire steps, sends/accepts a request, sends a private message, joins a community, submits posts, approves/rejects as assigned leader, rejects self-moderation, suspends/reactivates as admin, creates/assigns/archives a community and checks report/message privacy. Expected suspended-login HTTP 403 is classified separately from unexpected errors.

Photo tests cover ownership, decode/type/size/dimension checks, re-encoding, replacement/removal, stale versions, traversal, suspension and public/admin denial. Filter/API checks cover deterministic factor totals and bilateral rejected-pair exclusion. Author-only submission history never makes pending content visible in member feeds. Messaging failure feedback uses explicit client fault injection after successful real message persistence.

## Reproduction and limits

Student community refinement: all suites in the table passed on 2026-11-02, including all 120 preserved browser checks and 203 new checks (323 total). `tests/human-centered.mjs` inspects all 22 pages at 390/768/1024/1440px for overflow, one main heading, skip links, field labels, visible image loading and member photo sources. It checks exact hero text/actions, removal of the requested marketing elements, all four visible navigation links, anchor destinations, form-focused authentication and the simpler admin home. Explicit fetch injection verifies empty/error public directories and empty/delayed/failed discovery without changing production behavior. Existing role workflows verify keyboard navigation, reduced motion, persisted actions and permission boundaries; this is functional accessibility coverage, not a complete WCAG certification.

Run the additional suite with `FF_TEST_BASE` set to the QA server URL, for example in PowerShell: `$env:FF_TEST_BASE='http://127.0.0.1:18092'; npm run test:humanized`. Run browser suites sequentially because they share one CDP page. Its log is `test-results/human-centered-browser.log`; screenshots use `test-results/redesign/humanized-*.png`. Landing, mobile login and member dashboard screenshots were also visually inspected. Existing test coverage was retained; the final questionnaire label expectation was updated from “Your rhythm” to “How often you take part.”

Earlier publication recheck on 2026-11-02: Java compilation, 286 domain checks, 15 photo-processing checks, 120 HTTP/PostgreSQL checks, 42 photo-security checks, 74 HTTP/static checks, 71 prepared SQL statements, six constraint rejections, six discovery filters, JavaScript syntax, local assets, documentation links and ten messaging browser checks passed. PostgreSQL recovered successfully after an interrupted shutdown. The QA/preview helpers now accept an already stopped Java server; conversation photo metadata is fetched once per conversation-list request. That publication recheck reran only the messaging browser suite; the subsequent refinement re-executed all suites as recorded above.

Use a disposable seeded database: these suites create and modify persistent fixtures. Fresh installation loads schema, seed and migration 001; existing installations apply only the additive migration. Never reload the fresh-install schema as an upgrade.

The local runner targets the separate `friendfinder_redesign_qa` database at PostgreSQL port 55439 and Java port 18092. Install the JDBC JAR, prepare the database, then run build, migration and restart tasks. Standalone test scripts support `--base` or `FF_TEST_BASE`. No npm packages are required. Browser suites share a CDP page and must run sequentially. This Windows environment needed headless `--no-sandbox --in-process-gpu` for its dedicated test browser only; application security is unchanged.

Logs are retained in ignored `test-results/redesign*.log`; screenshots are in `test-results/redesign/`. Screenshots represent real local test fixtures, not production activity. SQL preparation checks syntax/columns and does not replace JDBC integration. Constraint tests validate expected SQLSTATE and roll back. This verification is local functional/security regression evidence, not production load or penetration testing. Lecturer confirmation of HttpServer versus the sample Servlet wording, leader-authored post review policy and actual team assignments remain documented decisions.
