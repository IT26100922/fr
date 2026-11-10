# Message and community photo attachments

Members can send one photo in an accepted friend's private conversation and submit up to four photos per community post. Captions are optional when photos are selected. Text-only messages and posts keep their existing endpoints. Group conversations remain text-only. Community photo posts follow the existing assigned-leader review process.

## Installation and upgrades

For a fresh database, apply `schema.postgresql.sql`, `seed.postgresql.sql`, migration `001_profile_photos.sql`, then migration `002_photo_attachments.sql`, using `psql -v ON_ERROR_STOP=1`. For an existing database, back it up and apply only missing migrations, in order. Never rerun the fresh schema to upgrade an existing installation.

```powershell
psql -h 127.0.0.1 -p 5432 -U postgres -d it_friend_finder -v ON_ERROR_STOP=1 -f database/migrations/002_photo_attachments.sql
.\backend\dependencies.ps1
.\backend\photo-dependencies.ps1
.\backend\run.ps1
```

Replace host, port, database and user with your installation's values. For this machine's existing cluster, consult [the local database guide](../MY_DATABASE_SETUP.md). The dependency scripts pin versions and verify SHA-256 hashes. `run.ps1` invokes both scripts before compilation; existing verified JARs are reused. An initial installation needs network access to Maven Central.

The application uses pgJDBC 42.7.8 and six TwelveMonkeys ImageIO 3.15.0 modules for WebP decoding: common-lang, common-io, common-image, imageio-core, imageio-metadata and imageio-webp. JPEG/PNG decoding uses the JDK. TwelveMonkeys is BSD-3-Clause licensed; see [upstream source and license](https://github.com/haraldk/TwelveMonkeys). No Maven executable or frontend package installation is required.

## Configuration and storage

`upload.path=data/uploads` stores generated PNG files in private `messages/` and `posts/` subdirectories, outside `frontend/`. `upload.max.bytes=5242880` sets the per-image input cap and may be lowered, but not raised above 5 MiB. Environment overrides are `FF_UPLOAD_PATH` and `FF_UPLOAD_MAX_BYTES`. Database variables `DB_URL`, `DB_USER`, `DB_PASSWORD` take precedence over their legacy `FF_DB_*` equivalents, then `config.local.properties`.

Accepted still images are JPEG, PNG and WebP, at most 4096 pixels per side and 16 million pixels. Java validates contents and structure, decodes and rewrites pixels into a fresh PNG fitting 1600 pixels, with at most 8 MiB encoded output. Original names and metadata are not stored. Files use generated UUID names. Back up PostgreSQL, profile media and attachment storage together. Transaction failures remove newly written files; a process crash or failed cleanup can leave unreachable files requiring later reconciliation.

## HTTP contract

All routes below use the `/api` prefix and require an active member session. Upload mutations also enforce the existing Origin rule.

| Method | Route | Request / response |
|---|---|---|
| POST | `/messages/with-photo` | Multipart fields `conversationId`, optional `body`, exactly one `photos` file; returns `id`, `message` |
| POST | `/posts/with-photos` | Multipart fields `communityId`, optional `title`, `body`, one to four `photos` files; returns `id`, `message`; post starts PENDING |
| GET | `/attachments/{id}` | Authorized normalized PNG with no-store/nosniff headers and generated inline filename |

Existing message and post reads include an `attachments` array (empty for text-only records) containing `id` and `url` (in photo position order). No physical path or original filename is returned.

Private photo access requires conversation participation, accepted friendship and unsuspended participants. Removing the friendship also blocks private history reads. Pending post photos are readable by the author and currently assigned leader; rejected photos by the author; approved photos by authenticated members while the community is active. Admins have no private-message or pending-photo override.

Invalid shape/count/dimensions return 400, unauthenticated reads 401, forbidden access 403, missing photos 404, excessive input bytes 413, unsupported formats 415, concurrent upload saturation 429 and database/storage unavailability 503. Two uploads may be processed concurrently; multipart bytes, headers and fields are bounded.

## Reproduce verification

Use the disposable database and server defined in `tools/attachment_checks.py` on PostgreSQL port 55439 and HTTP port 18093. These tasks never target the configured student database. `setup` refuses an existing database; it does not delete or reset one.

```powershell
python tools/project_checks.py domain
python tools/attachment_checks.py setup
python tools/attachment_checks.py start
python tools/attachment_checks.py api
python tools/attachment_checks.py restart
python tools/attachment_checks.py persistence
python tools/attachment_checks.py browser-start
python tools/attachment_checks.py browser
python tools/attachment_checks.py regression
```

API fixture generation needs Pillow as a development dependency. Browser checks need a dedicated Chrome/Edge profile with CDP on port 9222. Logs/screenshots remain in ignored `test-results/`. Java restart verification checks stored attachment reads after fresh login; it does not establish PostgreSQL restart persistence. See [the current verification report](../TESTING_RESULTS.md).
