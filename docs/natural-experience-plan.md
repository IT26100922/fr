# A more natural Friends Finder experience

## Purpose

Make Friends Finder feel like a place where people actually study, meet, and build projects together. The intended result is a friendly community website with recognizable people, useful content, and clear interactions.

This document is a design and implementation brief. The photos, layouts, and features below are proposed; this documentation update does not implement them. The application remains plain Java, JDBC, PostgreSQL, and HTML/CSS/vanilla JavaScript.

## What currently creates the generic feel

The current files show several concrete issues:

- `frontend/assets/images/` contains only `favicon.svg`; there are no photographs of people or communities.
- `common.js` renders every avatar as initials. Profiles and conversations therefore lack visual identity.
- The landing page uses a glowing orb, floating example match card, repeated glass panels, and a custom cursor. These compete with the actual community content.
- Most topic cards share the same layout with abstract symbols instead of distinctive imagery or examples of community work.
- Phrases such as “A little connection. A lot of possibility.” and repeated references to curiosity/possibility describe a mood more often than a useful activity.
- The page is dominated by promotional sections; it offers little public detail about what a visitor could do with another member.
- The landing topic links all lead to registration. They do not currently provide meaningful exploration before signup.

These are design observations, not evidence that the product uses AI. The matching system is deterministic. Changing only the photos would leave many of these issues unresolved.

## Design direction

Use a student-community feel: candid photography, readable text, modest branding, and content about actual learning and collaboration.

| Element | Proposed direction |
|---|---|
| Color | Warm neutral page surfaces and clear text, with violet reserved for primary actions and selection; retain a comfortable dark option if implemented consistently |
| Typography | Sentence-case headings, normal letter spacing, fewer oversized slogans, and a clear reading hierarchy |
| Layout | A large photo-led introduction, practical community previews, then a short explanation of how to join; allow different section sizes instead of repeating identical cards |
| Surfaces | Mostly solid panels with subtle borders; use shadows sparingly and remove the glowing orb and repeated glass effects |
| Pointer and motion | Native cursor; small state transitions that clarify an action, respect reduced motion, and never delay reading |
| Content | Specific topics, projects, questions, and member goals; show genuine activity only when the backend provides it |
| Personality | Friendly and direct, with room for individual bios and community descriptions rather than the same polished tone everywhere |

Suggested opening: **“Find someone to learn and build with.”** Supporting text: **“Meet people learning Java, working on side projects, or looking for a study partner.”** Primary action: **“Find a study partner”**. Secondary action: **“Browse communities”**, once a real preview flow exists.

## Photo wishlist

### First collection: 14 photographs

The filenames below are requested assets, not files that already exist. Supply the original image and its permission/source information; final compressed variants can be produced during implementation.

| Quantity | Suggested filename | Subject and composition | Placement | Target crop / source size |
|---|---|---|---|---|
| 1 | `hero-study-group.jpg` | Three or four students discussing work around a laptop in a real study space; relaxed expressions, natural light, subjects readable on a narrow crop | Landing introduction | Landscape 3:2, at least 2400 × 1600 |
| 1 | `story-study-partners.jpg` | Two people comparing notes or explaining a problem; include the working context rather than a posed handshake | Study-partner story / how it works | 4:3, at least 1600 × 1200 |
| 1 | `story-project-team.jpg` | A small team sketching an interface or reviewing a project together | Project collaboration story | 4:3, at least 1600 × 1200 |
| 1 | `story-community-session.jpg` | A discussion or workshop with several participants; a sense of place and participation | Community section or registration side panel | 4:3, at least 1600 × 1200 |
| 10 | Community covers listed below | A relevant activity or real working environment, with room for responsive crops | Landing topic previews and community pages | Landscape 16:9, at least 1600 × 900 each |

The three story photos can be reused thoughtfully across registration and onboarding. Do not add a separate decorative photo to every panel. Messages, reports, moderation queues, and long forms should prioritize usability.

### Ten community covers

| Filename | Preferred subject |
|---|---|
| `community-ai.jpg` | People discussing an AI project with a whiteboard or laptop; avoid robot faces and glowing brains |
| `community-machine-learning.jpg` | A model experiment, dataset review, or notebook discussion in a recognizable work setting |
| `community-cyber-security.jpg` | A normal security lab or team reviewing a system; avoid hooded-hacker imagery |
| `community-software-engineering.jpg` | Pair programming or a code-review discussion |
| `community-web-development.jpg` | Someone sketching or reviewing a website layout |
| `community-mobile-development.jpg` | A small team testing a phone application |
| `community-data-science.jpg` | People investigating a chart or dataset together |
| `community-networking.jpg` | Practical networking equipment, a lab, or hands-on setup |
| `community-cloud-computing.jpg` | A team planning infrastructure or working through a deployment diagram |
| `community-devops.jpg` | A collaborative build/release review with a visible working context |

If ten suitable covers are unavailable, start with the hero plus three story photos. Keep the remaining community cards typographic until relevant covers are ready; random filler pictures will weaken the result.

### Optional second collection: profile portraits

Use a member's own chosen image when profile-photo functionality is built. Keep initials as the fallback for people who do not upload a photo.

For an explicitly labeled demo, up to nine square portraits could represent the nine seeded accounts. They must be consented photos or appropriately licensed demo imagery. Stock portraits must not be presented as the identities of actual members, and real students should not be assigned to fictional accounts without their permission.

Portrait request: head-and-shoulders, natural lighting, varied backgrounds, at least 800 × 800, with room around the face for a circular crop. Do not use identical studio poses or auto-generated faces as a substitute for authentic community identity.

## How to choose and prepare photos

- Prefer original photos of the actual project team or consenting participants in spaces relevant to the audience. If this is a campus community, recognizable local learning environments can help.
- Use natural light, ordinary clothing, a range of participants, and believable working moments. Avoid staged pointing, forced group smiles, excessive screens, and images covered in code overlays.
- Keep text out of the image itself. Place headings and buttons in HTML so they remain readable and responsive.
- For each photo, record the source, photographer, permission/license, required attribution, focal point, and intended placement. Do not publish private information visible on screens or badges.
- Keep originals outside the public asset bundle. Proposed public folders are `frontend/assets/images/people/`, `communities/`, and `stories/`.
- Produce responsive WebP/AVIF variants with suitable fallbacks. Suggested starting budgets are 200–350 KB for the hero, 80–150 KB for covers, and 20–50 KB for small portraits; judge actual quality and loading performance before setting final limits.
- Include image dimensions, useful alt text, and a deliberate crop position. Use empty alt text when the image is purely decorative and repeats nearby content.
- Load the first visible hero promptly and lazy-load images farther down the page. Keep pages readable when an image is missing or fails to load.

## Interaction plan

Interactive should mean that a person can explore, act, and understand the result. Extra animation does not replace that behavior.

| Area | Existing behavior | Proposed improvement | What must be built |
|---|---|---|---|
| Landing topics | All topics link to registration | Open a useful preview with the topic description and examples of what members discuss; preserve the selected topic during signup | Preview UI and selected-interest handoff; an approved public API projection if live community content is exposed |
| Community discovery | Authenticated community list and membership actions exist | Add search/topic filters, photo covers, and a clear joined state | Frontend filtering and rendering first; server pagination/filtering when dataset size requires it |
| Suggested people | Compatibility scores and friend requests exist | Explain shared interests, experience, and goals; show request state immediately | Score explanation data/UI and accessible pending/error states; keep existing backend permissions |
| Onboarding | Five steps and progress already exist | Use concrete examples for ratings, friendly labels, and clear back navigation; optionally preserve unfinished answers | Copy/layout updates; optional local draft storage with clear clearing behavior on logout/account changes |
| Profiles | Name/bio editing and initials exist | Let members choose a portrait and describe a specific learning/project goal | Image validation/storage, photo metadata, authenticated update endpoint, and frontend upload/crop/fallback UI |
| Friend requests | Send/accept/reject/remove exist | Confirm the resulting state in place without a disruptive full reload; make unavailable actions understandable | UI state management and conflict handling; rejected-request policy remains a separate product decision |
| Messages | Private/group chat and four-second polling exist | Preserve a draft after a failed send, show sending/failure state, and offer an explicit retry | Message composer state and retry handling; request identifiers if automatic retries are introduced to avoid duplicate messages |
| Community posts | Submission, approval, and comments exist | Let people expand content, see useful relative times, and understand why their post is pending | UI rendering and author-visible status data; any new status endpoint must enforce ownership/access |
| Empty states | Text messages already exist | Give one specific next step, such as “Browse communities” or “Find someone to study with” | Contextual links/buttons with keyboard focus and real destinations |

Do not add fake online indicators, typing status, unread counts, testimonials, popularity numbers, or “recent activity” text. Each requires genuine data and a defined behavior. Likes, saved posts, notifications, read receipts, and event booking would be new features, not styling changes.

## More human wording and content

| Current or generic wording | Suggested replacement |
|---|---|
| “A little connection. A lot of possibility.” | “Looking for someone to study Java with?” |
| “Different interests. Shared possibilities.” | “What are you learning?” |
| “Discover people on your wavelength.” | “Find people with similar interests.” |
| “Your friend list is waiting for its first hello.” | “No friends yet. Browse your suggested people to get started.” |
| “Break the ice.” | “Send your first message.” |

These are starting points, not a script to repeat everywhere. Use short labels such as “Join community”, “Request sent”, “Save profile”, and “Waiting for review”. Success and error messages should name the actual action. Keep a member's writing intact; do not rewrite every bio into marketing language.

Useful example content is more convincing than decorative counters: “Practicing Java inheritance this week” or “Looking for one teammate for a weather app.” Mark seeded stories and profiles as demo content. Add genuine member stories only when the people involved have supplied them.

## Technical work needed

1. Refactor the existing CSS into consistent color, spacing, text, image, and state rules. Keep the plain frontend stack and introduce shared image/card helpers rather than duplicating markup for every page.
2. Create an asset manifest mapping photo keys to URLs, dimensions, crop positions, alt text, and attribution. Start with static community and story assets; avoid embedding external photo URLs throughout JavaScript.
3. Add an image helper with responsive variants and an initials/neutral fallback. Photo failure must not make a profile or button unusable.
4. For user uploads, store image files in a controlled media directory or object store and store metadata/asset keys in PostgreSQL. Add a versioned migration for profile-photo fields instead of rerunning the fresh schema against existing data.
5. Validate upload size, actual image format, generated filenames, and ownership. Generate bounded image variants and define replacement/deletion behavior. Do not put demo portraits on accounts without an explicit demo mapping.
6. Add preview/filter/composer state handling incrementally. Add backend endpoints only where the feature needs data that the existing APIs do not supply.
7. Reuse the current escaping and server-side access checks. Keep private profile/message data out of public community previews.

No new AI service is required for this direction. Authentic source material, useful content, and consistent implementation are the main inputs.

## Build order

| Stage | Work | Reviewable result |
|---|---|---|
| 1 — Content and assets | Collect the hero and three story photos, confirm their sources, rewrite landing copy, and define visual tokens | A small asset list and one landing-page design direction |
| 2 — First visible change | Build the photo-led introduction and distinct topic previews; remove the orb/custom cursor and reduce glass effects | Landing page that works at mobile and desktop sizes with real links |
| 3 — Member experience | Add relevant community covers, clearer people cards, match explanations, filters, and request feedback | One complete member journey from discovery to accepted request |
| 4 — Personal identity and conversation | Implement optional profile-photo uploads and more resilient message states | Verified upload permissions and a chat flow that handles slow/failed requests |
| 5 — Verify and refine | Test with people, inspect real browser flows, improve wording/crops/spacing, and measure image loading | A documented set of findings and fixes, not only screenshots |

Start with the landing page and one complete member journey. Keep administration focused on readable tables and clear actions instead of adding decorative photos.

## Definition of done

- A new visitor can explain what the site does and find the next step without relying on promotional slogans.
- Every published photo has a recorded source/permission and a useful role on the page; fictional demo identity is clearly distinguished.
- Topic previews provide information, filters change visible results, and buttons report real backend state.
- Missing photos, slow requests, validation failures, empty results, and failed sends have usable outcomes.
- Pages work without hover, with a keyboard, and with reduced motion. Text over photography remains legible; focus and contrast are checked.
- At representative mobile, tablet, and desktop widths, crops preserve the subjects, layouts do not overflow, and images do not shift surrounding content while loading.
- Registration, onboarding, friendships, chat, moderation, and reports still pass the existing checks. Authenticated browser journeys are actually exercised and console issues recorded.
- Image loading is measured before/after on a constrained connection; the first screen remains useful while lower-page assets load.
- A small usability session with three to five representative people records whether they can discover a community, explain a match, and send a request without help. Use the observations to revise the design.

Related guides: [project overview](project-overview.md), [application flow](application-flow.md), [engineering improvements](improvements.md), and [testing](testing.md).
