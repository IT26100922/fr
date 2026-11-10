# Student community refinement

Implemented on 2026-11-02 on the existing Java/JDBC/PostgreSQL application. This is a frontend refinement. Backend behavior and stored data are preserved. See the [backend dependency and impact proposal](backend-simplification-proposal.md) for unimplemented scope changes.

## Page audit and changes

| Page | Clutter identified | Refinement and retained behavior |
|---|---|---|
| Landing | Brand tagline, uppercase slogan, photograph overlay, extra hero note, repeated section introductions and footer navigation | Exact requested heading/description and two hero buttons; unchanged group photograph, larger image share, moderate corners, shorter spacing; all four header links remain visible on mobile; two useful study/project entry points and real community directory |
| Login | Large stock-photo panel and repeated invitation copy | Compact brand header and labeled form; password visibility, validation, error feedback and register link remain |
| Registration | Same photo panel and decorative labels | Form-first layout, clear title, short next-step explanation; required fields, confirmation and questionnaire handoff remain |
| Questionnaire | Promotional page title, “learning journey” and “rhythm” wording | Direct questions, five steps and preserved answers/validation/progress; no photography on the form |
| Member dashboard | Repeated tagline and page label, long section headings | Personal greeting, useful student/community suggestions, incoming requests, posts and recent chats retained; smaller profile placeholders and simpler cards |
| Discover | Slogan title, dominant initials panels | “Discover students”, compact preference-score cards, existing filters and factor explanation; member uploads only, initials fallback |
| Friends | Motivational subtitle and invented default bio | Simple Friends heading; honest empty bio; incoming/outgoing requests, accept/decline, remove and messages preserved |
| Profile | Decorative experience label and dense technical photo explanation | Plain experience text; concise upload constraints and own-photo reminder; edit, upload/replace/remove and friendship state remain |
| Communities | Duplicate category label, extra interest-fit badge, ambiguous Joined/Leave label | Direct heading, category-specific photos including student collaboration scenes, clear View/Join/Leave actions, search and real counts |
| Community detail | Promotional composer heading and long motivational text | “Write a post”, one review-rule sentence, real cover/description, leader/members, submission status and comment controls remain |
| Feed/posts/comments | Promotional heading and repeated introduction | Community posts heading, author/date/body, comment counts/forms and author-only review status retained; no decorative images inside posts |
| Conversations | Repeated page subtitle and giant visual emphasis | Direct heading and existing private/group navigation; persisted sends, draft retention/retry, polling and participant-only access retained |
| Leader dashboard / approvals | Motivational moderation copy | Direct headings, useful pending/community/member counts and review actions; full post preview and self-moderation restriction retained; no decorative table/form photos |
| Admin dashboard | Full report repeated below four statistics | Three basic totals and links to management/report/activity pages; full report remains on its dedicated page and API remains intact |
| Admin users / communities / reports / activity | Promotional subtitles | Direct task names; tables, search, date selection, confirmations, community editing/archiving and privacy remain |
| Public preview / credits / settings | Repeated branding/navigation and slogans | Consistent compact public header/footer; factual photo provenance retained; settings uses direct title and browser/session information |

## Visual and photography decisions

Warm neutral backgrounds, readable text, local Inter typography, restrained purple for actions/selection, subtle borders/shadows and moderate radii. Removed positional card hover motion and the unused landing overlay styles. Native cursor, visible keyboard focus, reduced-motion support, lazy responsive WebP images and theme choice remain.

Reused the existing local Unsplash-licensed study, project and workshop photographs for relevant community covers. No additional downloads or dependencies were needed. Existing source/license records and optimized variants remain in [photo sources](../frontend/assets/images/photos/sources.json). Stock images illustrate shared activities; they never represent a registered member. Optional user-owned uploads and initials remain the only member profile image sources.

## Verification

Execution results are recorded in [testing](testing.md). Existing test suites are preserved. The questionnaire browser assertion is updated only to match the clearer final-step label. Additional browser coverage checks the exact requested landing content, visible mobile navigation and remaining pages/states.
