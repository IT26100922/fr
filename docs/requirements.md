# Requirements

## Functional scope

Visitors see a topic-oriented landing page and can register/login. Registration creates a MEMBER account and session. All ten interest ratings, at least one goal, experience, collaboration, and activity are saved before viewing matches.

Members and community leaders can edit their name/bio, update their questionnaire, view ranked matches, inspect profiles, send/answer friend requests, remove friends, join/leave active communities, submit posts, comment on approved posts, and use private/group conversations. All visible actions invoke Java APIs with PostgreSQL persistence.

Private messaging requires friendship when opening or sending. Group creators invite 1â€“19 active friends and are added automatically. All conversation reads/writes require participation. Suspended participants pause message sending; suspended accounts cannot use authenticated APIs.

Leaders inherit member behavior. Only the currently assigned leader of an active community may approve or reject its pending posts, and cannot moderate their own posts. Pending/rejected posts are excluded from normal feeds. Admins have no moderation override and no normal private-message reader.

Administrators search/view user summaries, suspend/reactivate non-admin accounts, create/edit/archive communities, assign leaders, inspect activity metadata, and view UTC daily reports. Statistics and reports come from the database, never frontend constants.

## Nonfunctional requirements

- Plain Java 21+ with built-in HTTP server and JDBC; PostgreSQL 14+.
- HTML/CSS/vanilla JS modules; no frameworks or bundler.
- Understandable model â†’ DAO â†’ service â†’ controller separation.
- Prepared statements, validated input, salted PBKDF2 hashes, HttpOnly sessions, server-side access rules.
- Accessible labels, visible focus, responsive layouts, and reduced-motion handling.
- Warm light and charcoal dark themes, local photographs, a native cursor, and restrained reduced-motion-aware transitions.
- Explicit loading, validation, conflict, empty, success and failure states.
- PostgreSQL persistence for all application data; only short-lived authentication sessions live in Java memory.

## Acceptance and evidence

The acceptance criteria include compilation, schema/seed/migration execution, user/leader/admin workflows, responsive UI, role enforcement and documentation alignment. Verification passes 286 domain, 15 photo-processing, 120 HTTP/PostgreSQL, 42 photo-security and 120 browser checks, plus SQL/constraint, static-resource, syntax, filter and image-asset checks. Consult [testing](testing.md) for executed evidence, reproduction and limits.

See [application flow](application-flow.md) for the implemented journeys and [improvements](improvements.md) for proposed work outside the current acceptance evidence.

## Implemented redesign scope

The redesign retains the original persistence and role rules while adding a public community directory projection, filtered people discovery with real factor explanations, approved feed navigation, author-only submission status, and owned profile-photo CRUD. The photo extension requires additive migration 001. It does not add universities/locations, live presence, unread counts, likes, bookmarks, advanced group management, or AI services.

See [university deliverables](university-deliverables.md) for the architecture confirmation question, contribution template, and viva workflow. Final executed redesign evidence is recorded in [testing](testing.md).
