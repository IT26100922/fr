# SE1020 project report and viva guide

## Project summary

IT Friend Finder helps technology students discover compatible peers, form friendships, join interest communities, discuss approved posts, and collaborate in private/group conversations. It is a local academic application using plain Java, JDK HttpServer, JDBC, PostgreSQL, HTML/CSS, and vanilla JavaScript. Compatibility is deterministic; no AI service or personality test is used.

The redesign adds a photo-led public experience, light/dark themes, filtered people discovery, transparent match factors, author submission feedback, clearer chat states, and optional member-owned profile photos. Original role boundaries and persisted workflows remain in Java. See [implementation record](redesign-implementation.md), [change history](../CHANGELOG.md), and [testing](testing.md).

## Lecturer confirmation

The supplied SE1020 description permits file/SQL storage and mentions JSP/Servlets in a sample contribution section. Confirm whether that sample is mandatory for this team's marking rubric. This project already uses JDK HttpServer and PostgreSQL. It has not been migrated to Servlets, JSP, Spring, or an ORM. Do not describe lecturer approval as obtained until the team actually receives it.

## Architecture and diagrams

- [Architecture](architecture.md): request → controller → service/model → DAO/JDBC → PostgreSQL.
- [Class diagram](class-diagram.md): User/Member/CommunityLeader/Admin, conversations, and domain interfaces.
- [Database ER/design](database-design.md): original relationships and the additive photo metadata migration.
- [API reference](api-endpoints.md): actual routes, roles, payloads, and response rules.
- [Application flow](application-flow.md): onboarding, friendship, publishing, conversations, and administration.

## OOP concepts to demonstrate in source

| Concept | Source to explain | Demonstration |
|---|---|---|
| Encapsulation | `User`, `QuestionnaireResponse`, `ProfilePhoto` | Validated identity setters, private metadata, immutable preference collections |
| Inheritance | `User → Member → CommunityLeader`; `User → Admin` | A leader can use member features; admin permissions are separate |
| Runtime polymorphism | `Conversation.getDisplayName(viewerId)` in `MessageService` | A private conversation displays the peer's name; a group displays its title through the same base-type call |
| Dashboard polymorphism | `User.getDashboard()` overrides | Logging in routes roles to different dashboards |
| Interfaces | `Approvable` / `Post`; `Reportable` / `DailyReport` | Pending moderation transitions and date-specific report generation |
| Constructor overloading | `Member`, `Post`, `DailyReport` | New versus persisted objects and default versus chosen report date |
| Method overloading | `UserDAO.searchUsers`, connection-aware profile reads | Optional interest search; connection reuse without moving rules to the frontend |
| Associations | `CommunityMembership`, `Conversation`, `QuestionnaireResponse` | Membership links objects; conversations retain participant snapshots |
| JDBC and transactions | `Jdbc`, DAO classes, services | Bound parameters, generated IDs, rollback, and mutation/event consistency |
| File handling | `PhotoProcessor`, `PhotoService`, `ProfilePhoto` | Bounded decode/re-encode, generated filenames, owned metadata, private storage, and replacement cleanup |

## Working CRUD evidence

| Entity/workflow | Create | Read | Update | Delete |
|---|---|---|---|---|
| Friendship request | Send request | Incoming/outgoing/friend lists | Recipient accepts or rejects | Remove accepted friendship |
| Profile photo | Upload own image | Authenticated image and profile URL | Replace own photo and metadata | Remove own image and metadata |
| Community | Admin creates community | Directory/detail/member lists | Admin edits description/leader/status | Archive is a soft lifecycle action, not a physical table delete |
| Member profile | Registration | Own/authorized profile | Name, bio, questionnaire | Account deletion is not implemented or claimed |
| Community publishing | Submit pending post/comment | Approved feed and authorized history | Assigned leader moderates pending post | Post deletion is not implemented or claimed |

Show actual API responses and PostgreSQL changes. Never describe archive, logout, or hiding a card as deleting an account or post.

## Suggested viva sequence

1. Show the public landing page, ten real database interest communities, a public preview, and photo/source credits. Explain that stock environment imagery does not identify registered members.
2. Register a new account, complete the five steps, and show persisted preference values.
3. Open Discover People, use filters, and expand the five-factor explanation. Point to the same Java calculation that returns the score.
4. Send a request; in a separate browser profile, accept it as the recipient. Explain the unique unordered pair constraint and why rejected pairs are excluded from suggestions.
5. Open a private conversation and a named group. Show the different display names produced by polymorphism and verify a saved message after reload.
6. Edit a profile. Upload, replace, and remove a photo. Show its metadata row and explain why original filenames and executable content cannot become public files.
7. Join a community, submit a post, and show the author's pending status. Switch to the assigned leader, approve it, then add a comment as a member. Demonstrate self-moderation prevention separately.
8. Use admin statistics, user suspension/reactivation, community/leader management, and a UTC daily report. Explain why administrators cannot read private-message bodies.
9. Show the build/domain/API/audit/browser evidence and point out the remaining scope decisions honestly.

Use a disposable demonstration database and separate browser profiles for simultaneous roles. Do not run fixture-creating integration suites against data the team needs to retain.

## Individual contribution mapping

The current six-member proposal is in [TEAM_RESPONSIBILITIES.md](../TEAM_RESPONSIBILITIES.md), with current source paths, method/API/table ownership, tests, workload balancing and unassigned Git evidence. Use that document for the requested six-member allocation; the older grouping below is historical and is not the current team plan. No historical authorship is implied by either allocation.

Team names, student IDs, and agreed assignments have not been supplied. The table below is an allocation template, not a claim of individual authorship. Complete it with actual responsibilities and Git evidence.

| Student name / ID | Suggested area | Java/source explanation | Evidence to fill in |
|---|---|---|---|
| To be assigned | Accounts, onboarding, profiles/photos | `AuthService`, `ProfileService`, photo controller/service/DAO, identity models | Actual commits, tests, contribution notes |
| To be assigned | Matching and friendships | `MatchingService`, `UserDAO`, `FriendService`, `FriendDAO` | Actual commits, score examples, request lifecycle tests |
| To be assigned | Communities and moderation | Community/Post services and DAOs, `Approvable`, membership model | Actual commits, approval/access tests |
| To be assigned | Conversations | `MessageService`, `MessageDAO`, `Conversation` subclasses | Actual commits, participant/privacy tests |
| To be assigned | Administration and reporting | `AdminService`, `ReportService`, `DailyReport`, `Reportable` | Actual commits, UTC report and suspension tests |

Adjust the number of rows to the real team size. Each member should be able to trace their UI action through the controller, service/model, DAO, and persistent result.

## Git and final report checklist

- Preserve existing repository history; use `git log --oneline` and `git diff --stat` to identify actual changes.
- The redesign remains local until user review. A local diff is not a published PR or an approved release.
- Include the purpose, requirements, architecture, diagrams, CRUD/OOP mapping, installation steps, contribution mapping, test evidence, known limits, and references in the final submitted report.
- Record the real lecturer response about the transport requirement, actual team assignments, and any manual viva results before submission.
- Advanced group participant management, a second reviewer for leader-authored posts, deployment, and large-data pagination remain separate work; do not present them as delivered.
