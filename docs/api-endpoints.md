# API endpoints

Base path: `/api`. GETs return JSON data directly. JSON POSTs require `Content-Type: application/json` and a JSON object. The separate photo upload endpoint accepts bounded PNG/JPEG binary bytes. IDs are positive integer JSON numbers in bodies or numeric query parameters. Authentication is an HttpOnly `ff_session` cookie set on register/login; the frontend uses same-origin fetch. No token or password hash is returned to the browser.

Permissions: **Public**, **Authenticated** (all active roles), **Member** (Member or CommunityLeader), **Leader** (CommunityLeader), **Admin**. Suspended accounts are blocked at authentication. UI redirects are convenience; Java independently checks permissions.

## Authentication and profile

| Method | Route | Permission | Request | Response/purpose |
|---|---|---|---|---|
| GET | /health | Public | â€” | `{status:"ok"}` after real database query; 503 if unavailable |
| POST | /register | Public | fullName, username, email, password, confirmPassword | 201 `{user:profile}` and session cookie; always creates MEMBER |
| POST | /login | Public | login (username/email), password | `{user:profile}` and session cookie |
| POST | /logout | Authenticated | `{}` | Revokes session and expires cookie |
| GET | /users/me | Authenticated | â€” | Own profile, dashboard URL, onboarded flag, ratings/goals/preferences/communities |
| POST | /users/me | Member | fullName, bio | Update own name/bio |
| GET | /users/profile | Member | `?id=4` | Active non-admin profile and `friend_request` (null or id/sender/receiver/status) |
| GET | /interests | Authenticated | â€” | Topic id/name array |
| POST | /questionnaire | Member | interests, experience, goals, collaboration, activity | Save all answers transactionally |
| GET | /matches | Member | â€” | Ranked profiles with integer `match`, `match_factors`, optional `photo_url`; 409 until onboarded; all existing request pairs excluded |
| GET | /communities/recommended | Member | â€” | Ranked community array with interest-fit `match` |

Example questionnaire:

```json
{
  "interests": [{"id":1,"rating":5},{"id":2,"rating":4},{"id":3,"rating":2},{"id":4,"rating":4},{"id":5,"rating":3},{"id":6,"rating":2},{"id":7,"rating":5},{"id":8,"rating":2},{"id":9,"rating":3},{"id":10,"rating":3}],
  "experience":"Intermediate",
  "goals":["Friends","Project Partners"],
  "collaboration":"Both",
  "activity":"Daily"
}
```

Each interest must appear exactly once. Goals: Friends, Study Partners, Project Partners, Mentorship, Professional Networking. Experience: Beginner/Intermediate/Advanced. Collaboration: Mostly Discussion/Mostly Projects/Both. Activity: Casual/Few Times Per Week/Daily.

## Friendship

| Method | Route | Permission | Request | Purpose |
|---|---|---|---|---|
| GET | /friends | Member | â€” | Accepted active friends with id/name/username/bio/request_id |
| GET | /friends/requests | Member | â€” | Incoming and outgoing PENDING requests, sender_name/receiver_name |
| POST | /friends/request | Member | userId | Send to active non-admin, excluding self/existing pair |
| POST | /friends/accept | Member recipient | requestId | Accept pending request and log friendship |
| POST | /friends/reject | Member recipient | requestId | Reject pending request; repeated requests remain blocked |
| POST | /friends/remove | Member participant | userId | Remove accepted friendship |

## Communities and forum

| Method | Route | Permission | Request | Purpose |
|---|---|---|---|---|
| GET | /communities | Authenticated | â€” | Active community rows with leader_name, derived member_count, own joined flag |
| GET | /communities/members | Authenticated | `?communityId=1` | Active members' id/name/username/role; active community required |
| POST | /communities/join | Member | communityId | Join active community, reject duplicate |
| POST | /communities/leave | Member | communityId | Leave; assigned leader must remain until reassigned |
| GET | /posts | Authenticated | Optional `?communityId=1` | APPROVED posts in active communities; latest 100 |
| POST | /posts | Member in community | communityId, title, body | Create PENDING post |
| GET | /posts/pending | Leader | â€” | Pending posts in own assigned active communities |
| POST | /posts/approve | Assigned leader | postId | Approve pending post, excluding own post |
| POST | /posts/reject | Assigned leader | postId | Reject pending post, excluding own post |
| GET | /comments | Authenticated | `?postId=1` | Comments for an approved post in active community; otherwise empty array |
| POST | /comments | Member in community | postId, body | Comment on approved post only |

Post titles: 1â€“160 characters; bodies: 1â€“10,000. Comments: 1â€“2,000.

## Conversations and messages

| Method | Route | Permission | Request | Purpose |
|---|---|---|---|---|
| GET | /conversations | Member | â€” | Only own conversations; `display_name` comes from polymorphic Java method |
| POST | /conversations/private | Member, friends | userId | Create/reuse private conversation with friend; returns id |
| POST | /conversations/group | Member | name, participants | Create named group with 1â€“19 active friend IDs; creator added |
| GET | /messages | Member participant | `?conversationId=1` | `{messages:[...],participants:[...]}`; latest 200 chronological messages |
| POST | /messages | Member participant | conversationId, body | Persist message and metadata-only activity event |

Messages: 1â€“4,000 characters. Group names: 1â€“100. Private sends require current friendship. Any suspended participant pauses sends. Administrators are not members and cannot access message contents via these routes.

## Administration

| Method | Route | Permission | Request | Purpose |
|---|---|---|---|---|
| GET | /admin/dashboard | Admin | â€” | total_users, active_users, total_communities, report |
| GET | /admin/report | Admin | Optional `?date=2026-10-05` | UTC daily event metrics and most-active user/community |
| GET | /admin/users | Admin | Optional `?search=jason&interest=Artificial%20Intelligence` | Up to 100 user summaries; overloaded search with optional highly rated interest |
| POST | /admin/users/suspend | Admin | userId | Suspend non-admin; current sessions blocked immediately |
| POST | /admin/users/reactivate | Admin | userId | Reactivate non-admin |
| GET | /admin/communities | Admin | â€” | Communities including archived rows |
| POST | /admin/communities/create | Admin | name, description, interestId (number/null) | Create active community; returns id |
| POST | /admin/communities/edit | Admin | id, name, description, active (boolean), interestId (number/null) | Edit/archive/reactivate community |
| POST | /admin/communities/leader | Admin | communityId, leaderId | Assign active member, promote role and ensure membership |
| GET | /admin/activity | Admin | â€” | Latest 200 event/actor/community/time rows; no message body |

Report keys: date, new_users, deactivated_users, new_friendships, community_joins, community_leaves, posts_submitted, posts_approved, posts_rejected, comments, messages_sent, most_active_user, most_active_community. Most-active objects are null when no events exist on the date. Dates must use ISO `YYYY-MM-DD`.

## Response conventions

Successful changes normally return `{ "message": "Saved successfully" }`, with `id` added for created resources (or a reused private conversation). Registration returns 201; other successful mutations return 200. Java SQL TIMESTAMP values serialize as ISO UTC strings. PostgreSQL BOOLEAN fields serialize as JSON booleans; TIMESTAMPTZ values are returned as UTC instants.

Errors return `{ "error": "Readable description" }`:

| Status | Meaning |
|---|---|
| 400 | Invalid input/JSON, unsupported choice, wrong content type |
| 401 | Missing/expired/revoked session, invalid login |
| 403 | Suspended account, role/ownership/membership restriction, cross-origin POST |
| 404 | Missing resource or unknown endpoint |
| 405 | Unsupported method (GET/POST only; auth routes require POST) |
| 409 | Duplicate/conflict, already answered/moderated, missing onboarding, archived community |
| 413 | JSON request exceeds 64 KiB or photo upload exceeds 2 MB |
| 415 | Photo upload is not declared PNG/JPEG |
| 500 | Unexpected application failure |
| 503 | Database/driver/configuration unavailable |

SQL constraint errors are translated to a generic conflict; SQL details/passwords/credentials are never exposed to the browser. Resource names, database syntax and dates are fixed/prevalidated in Java; all SQL data values bind through PreparedStatement.

## Public discovery and author feedback

| Method | Route | Permission | Purpose |
|---|---|---|---|
| GET | /public/communities | Public | Up to 100 active communities: id, name, description, interest_id/name, real member_count; no member identities or posts |
| GET | /posts/mine | Member | Latest 100 own submissions with title, community, status, and timestamps; optional communityId filter; authenticated actor supplies ownership |

Match factors are the unrounded points for interests (max 50), goals (20), experience (15), collaboration (10), and activity (5). Their total rounds to `match`; this is the existing deterministic formula, not an AI prediction. Frontend filters operate on the returned bounded candidate set and do not bypass eligibility rules.

## Profile photos

| Method | Route | Permission | Request / response |
|---|---|---|---|
| POST | /photos | Member, self | Raw `image/png` or `image/jpeg` bytes, maximum 2 MB; returns message, photo_url, width, height |
| GET | /photos | Member | userId and optional current v; returns normalized PNG for an active non-admin profile; missing/stale versions return 404 |
| POST | /photos/remove | Member, self | JSON `{}`; removes owned metadata/file, restores initials fallback; 409 if absent |

Photo upload/remove never select another member from a supplied ID. A supplied different userId is rejected with 403. Upload and remove enforce the same Origin/session/suspension protections as JSON mutations. Administrators have no photo-management override. Public visitors cannot fetch profile images.

Actual file contents must match PNG/JPEG declaration; SVG, GIF, non-images, corrupted files, MIME mismatches, excessive dimensions, and oversized bytes are rejected. Inputs are 64–4096 pixels per side and at most 16 million pixels. Output is a metadata-free PNG resized to fit 640 pixels, with a generated UUID key. Client filenames and arbitrary server paths are never used. Binary and JSON photo responses are no-store/nosniff.

Profiles include `photo_url` or null. Authorized friends, requests, community members/leaders, post authors, and conversation participants may carry optional photo URL fields for the shared avatar renderer. No physical path or original filename is returned. Apply migration 001 before running this version.

## Message and post photo attachments

See [attachment HTTP contracts](photo-attachments.md#http-contract) for multipart upload routes, attachment metadata, download authorization, limits and error codes. Apply migration 002 before running the current message/post endpoints.
