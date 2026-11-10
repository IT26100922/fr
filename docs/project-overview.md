# About IT Friend Finder

IT Friend Finder is a local academic web application that helps people interested in technology find friends, study partners, and project collaborators. It combines a preference questionnaire, explainable compatibility scores, topic communities, and participant-controlled conversations.

The project demonstrates Java OOP and relational persistence through a working application. It uses PostgreSQL for application records and a Java process for HTTP serving and business logic. Matching is a deterministic calculation; it does not use an AI service.

## Who uses it

| Role | Main capabilities | Boundaries |
|---|---|---|
| Visitor | Read the landing page, register, and log in | Cannot access authenticated APIs |
| Member | Complete the questionnaire, find matches, manage friendships, join communities, submit posts/comments, and use conversations | Posts need leader approval; private chat needs friendship; conversations need participation |
| Community leader | Use member features and moderate assigned communities | Cannot approve their own posts or moderate another leader's community |
| Administrator | Manage accounts and communities, assign leaders, inspect activity metadata, and read daily reports | Has no routine post-moderation override or private-message reader |

Leaders inherit member behavior. Administrator behavior is separate. The backend checks the current role and suspension state on authenticated requests; hiding a button in the frontend is not the permission boundary.

## What the application does

1. Creates accounts with salted password hashes and an eight-hour session.
2. Collects ratings for ten technology interests, experience, goals, collaboration preference, and activity level in a five-step questionnaire.
3. Calculates member compatibility from interests (50%), goals (20%), experience (15%), collaboration (10%), and activity (5%). Community fit uses the related interest rating.
4. Supports friend requests, acceptance/rejection, friendship removal, and private conversations between accepted friends.
5. Supports groups of 2–20 initial participants, including the creator; invited participants must be the creator's active friends.
6. Publishes community posts after assigned-leader approval and allows community members to comment on approved posts.
7. Provides account suspension, community administration, activity metadata, and UTC daily reports.

See [application flow](application-flow.md) for the journeys and [architecture](architecture.md) for the scoring formula and OOP examples.

## How it is built

| Layer | Implementation | Responsibility |
|---|---|---|
| Browser | HTML, CSS, vanilla JavaScript modules | Forms, navigation, rendering, API requests, and four-second chat polling |
| HTTP | JDK `HttpServer`, `ApiController`, `StaticController` | Serve pages/assets, parse requests, dispatch APIs, and return responses |
| Services and models | Plain Java classes, inheritance, interfaces, collections | Validate domain values and enforce access and workflow rules |
| Persistence | DAO classes and prepared JDBC statements | Read/write PostgreSQL records and commit related mutations together |
| Database | PostgreSQL 14+ schema | Store application data and enforce keys, relationships, enums, and constraints |

The only external application dependency is the PostgreSQL JDBC driver. Source compilation uses the JDK; database APIs require the driver and a configured PostgreSQL instance. Python and Node scripts are development test clients, not application services.

## Stored data and sessions

PostgreSQL stores accounts, preferences, interests, memberships, friendships, community content, conversations, messages, and activity logs across 14 tables. Private-message text is not included in activity reports. A mutation and its associated activity event are committed together where the service records an event.

Sessions live in Java memory rather than PostgreSQL. Restarting the server signs users out, while their database records remain. The demo uses an HttpOnly, SameSite=Strict cookie over local HTTP; production HTTPS and durable sessions remain future work.

Use [database design](database-design.md) for relationships and [README setup](../README.md#requirements) to run the application. The schema is for a new database. The repeatable seed supplies nine demo accounts and ten technology communities; it is not a data migration tool.

## Current status and scope

The PostgreSQL verification run on 2026-11-01 passed compilation, 286 domain checks, 64 prepared statements, six constraint checks, and 110 real HTTP/PostgreSQL integration checks. Earlier public-page browser results are documented separately. Authenticated browser journeys and console checks remain pending; API success alone does not prove the browser experience.

The server binds to loopback for a small local academic demonstration. Deployment, password recovery, large-data pagination, durable sessions, and expanded group management are not delivered features. Read [testing](testing.md) for evidence, [change history](../CHANGELOG.md) for completed changes, and [improvements](improvements.md) for proposed work.
