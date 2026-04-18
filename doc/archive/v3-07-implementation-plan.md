# Mini LMS v3 — Implementation Plan for Outstanding Items

> **Series:** Phase 7 of the Mini LMS v3 design set. Consolidates the "as-built drift" observations from §0 of docs 01–05 plus the new UI work in doc 06 into a single, prioritised execution plan.
> **Input docs:** [01 Overview & architecture](./mini-lms-v3-01-overview-architecture.md) · [02 Foundation · Auth · RBAC](./mini-lms-v3-02-foundation-auth-rbac.md) · [03 Content & learning](./mini-lms-v3-03-content-learning.md) · [04 Assignments & mentoring](./mini-lms-v3-04-assignments-mentoring.md) · [05 Evaluation · reporting · delivery](./mini-lms-v3-05-evaluation-reporting-delivery.md) · [06 UI sidebar](./mini-lms-v3-06-ui-sidebar-navigation.md).
> **Audience:** Implementing engineer and reviewer. Each task has evidence, acceptance criteria, and the design §. Nothing here should be new requirements — everything traces back to an earlier doc.

---

## §0 Reading guide

- **Priority ladder:** P0 (security / data loss risk) → P1 (missing user-visible feature) → P2 (ops hardening) → P3 (polish / post-acceptance).
- **Effort scale:** `S` ≤ 0.5 day · `M` ≈ 1–2 days · `L` ≈ 3–5 days. No calendar dates — sequence depends on reviewer availability.
- **Source column:** link back to the drift item that surfaced the work (doc number + row index in that doc's §0 table). If a task has no origin row, it's from doc 06.
- **DoD** (Definition of Done) is the minimum evidence a reviewer should see before approving.

---

## §1 Summary by priority

| Priority | Count | Theme |
|---|---|---|
| P0 | 4 | Authorisation gaps, broken writes |
| P1 | 9 | User-visible feature gaps (sidebar, uploads, routes) |
| P2 | 7 | Ops, migrations, file hygiene |
| P3 | 8 | Polish, deferred optimisations |
| **Total** | **28** | (some doc §0 rows are intentionally accepted and not re-listed here) |

Items that were marked "accepted as-is" in the §0 tables (e.g. single-page `/admin/users`, flat route tree, live-query stats instead of cached counters) are **not** repeated in this plan. If scope changes, lift them from the source doc.

---

## §2 P0 — Security and correctness (do these first)

### P0-1 · Implement `requireOwnStudent(studentId)` for MENTOR pairing

- **Source:** [doc 02 §0 row 4](./mini-lms-v3-02-foundation-auth-rbac.md)
- **Why:** [lib/permissions.ts](../mini-lms/lib/permissions.ts) currently exports an empty TODO stub. Any action that should be limited to "a mentor's paired mentees" is actually unrestricted for all MENTORs.
- **Scope:**
  1. Query `MentorStudent` (or whatever the pairing table is named in `schema.prisma`) for a row where `mentorId = session.user.id AND studentId = args.studentId AND active`.
  2. Throw a typed auth error if missing; callers catch and return 403.
  3. Replace TODO in `lib/permissions.ts` with the real implementation.
- **Callers to re-audit:** every server action / route under `app/mentees/**`, `app/review/**`, `app/observe/**` that loads a specific student's work.
- **DoD:** Seed script creates mentor A paired with student X only. Logging in as A and hitting a route for student Y returns 403. Unit test in `lib/permissions.test.ts`.
- **Effort:** M.

### P0-2 · Per-submission file-access check in `/api/files/[...key]`

- **Source:** [doc 04 §0](./mini-lms-v3-04-assignments-mentoring.md) (file access row)
- **Why:** [app/api/files/[...key]/route.ts](../mini-lms/app/api/files/[...key]/route.ts) only checks enrollment for `lessons/{id}/…`. Any other key (submissions, videos, covers) is served to any authenticated user who guesses the path.
- **Scope:**
  1. Add a prefix dispatcher: `lessons/…` → existing enrollment check; `submissions/…` → owner-or-reviewer check (owner = submission's student, reviewer = paired mentor/instructor/admin via P0-1); `videos/…` → owner-or-reviewer; `covers/…` and `public/…` → allow.
  2. Unknown prefixes → 404 (don't leak existence).
- **DoD:** Integration test attempting cross-user access returns 404/403; existing "own submission" fetch still works.
- **Effort:** M. Depends on P0-1.

### P0-3 · Enforce `UNDER_REVIEW` lock on submission edits

- **Source:** [doc 04 §0](./mini-lms-v3-04-assignments-mentoring.md)
- **Why:** State-machine intent is that once a submission enters `UNDER_REVIEW`, the student cannot modify it. Current code does not assert this on the edit path.
- **Scope:**
  1. In the submission-edit server action, `SELECT state FROM submission WHERE id = ? AND studentId = session.user.id FOR UPDATE` (or transaction-wrap with `prisma.$transaction`).
  2. If state ∈ `{UNDER_REVIEW, PASSED}` → throw; return friendly error to UI.
  3. Write the state transition matrix comment at top of the action so the next reader sees the rules.
- **DoD:** Manual test: submit → mentor opens → student tries to edit → blocked with toast. Automated test in `lib/validators.test.ts` or a new `state-machine.test.ts`.
- **Effort:** S.

### P0-4 · Create the missing Prisma migrations

- **Source:** [doc 02 §0 row 1](./mini-lms-v3-02-foundation-auth-rbac.md)
- **Why:** `prisma/migrations/` is **empty**. Environments are currently bootstrapped with `prisma db push`, which means schema history is lost and no reproducible migration exists for prod.
- **Scope:**
  1. On a clean database, run `prisma migrate dev --name init` to capture current `schema.prisma` as a baseline migration.
  2. Commit the generated SQL.
  3. Document in [doc 01](./mini-lms-v3-01-overview-architecture.md) §deployment that future schema changes must go via `migrate dev` → `migrate deploy`, not `db push`.
- **DoD:** `prisma migrate status` against a fresh DB reports "Database schema is up to date". A throwaway test DB successfully runs `migrate deploy` from scratch.
- **Effort:** S — but coordinate: the dev who does this must first confirm no other branch has schema changes in flight.

---

## §3 P1 — User-visible feature gaps

### P1-1 · Mount `<AppShell>` sidebar with logout (doc 06)

- **Source:** [doc 06 §5](./mini-lms-v3-06-ui-sidebar-navigation.md)
- **Scope:** Follow the seven sub-steps in doc 06 §7 verbatim.
- **DoD:** All authenticated pages render the sidebar; `/login` stays bare; sign-out returns the user to `/login` with the session cookie cleared.
- **Effort:** M. Self-contained — can land in parallel with P0 work.

### P1-2 · `/teach/[id]/lessons` list/manage page

- **Source:** [doc 03 §0](./mini-lms-v3-03-content-learning.md)
- **Why:** Doc 03 specifies a lesson list view under `/teach`; currently instructors can create lessons but cannot see the full list for a course without clicking through.
- **Scope:** Table of lessons (title, order, published flag, last edited), reorder affordance, link to the existing edit page.
- **DoD:** INSTRUCTOR can view all lessons of a course they own in one screen; MENTOR/STUDENT cannot reach the route.
- **Effort:** M.

### P1-3 · Cover-image upload for courses

- **Source:** [doc 03 §0](./mini-lms-v3-03-content-learning.md)
- **Why:** `Course.coverImageKey` exists in the schema, but [app/api/upload/route.ts](../mini-lms/app/api/upload/route.ts) enforces `PREFIX_PATTERN = /^lessons\/\d+$/` which blocks every non-lesson upload — including covers.
- **Scope:**
  1. Broaden the upload API to accept allow-listed prefixes: `lessons/{id}`, `covers/courses/{id}`, and (for P1-4) `submissions/{id}`, `videos/{id}`.
  2. Keep the per-prefix role check distinct (covers: `canAuthor`; submissions: `canLearn` + ownership; videos: `canReview`).
  3. Cover UI in the course edit page — reuse `components/shared/file-upload-dropzone.tsx`.
- **DoD:** Instructor uploads a cover; thumbnail appears on `/courses`. Attempting to upload to an unknown prefix returns 400.
- **Effort:** M.

### P1-4 · Raise upload cap for observation videos (≥ 500 MB)

- **Source:** [doc 05 §0](./mini-lms-v3-05-evaluation-reporting-delivery.md)
- **Why:** `MAX_FILE_SIZE = 10 * 1024 * 1024` in the upload route blocks observation-video uploads that the spec calls for at up to 500 MB.
- **Scope:**
  1. Per-prefix size limits in `app/api/upload/route.ts` — e.g. `lessons/*`: 25 MB, `covers/*`: 5 MB, `submissions/*`: 50 MB, `videos/*`: 500 MB.
  2. Switch to presigned-PUT to MinIO for prefixes > 50 MB so the Node process doesn't buffer large bodies. Existing single-shot upload stays for small files.
  3. Client shows progress for large uploads (use `XMLHttpRequest` for the presigned PUT so we get `onprogress`).
- **DoD:** A 200 MB test file uploads successfully in under a minute on local dev; server process memory stays flat.
- **Effort:** L.

### P1-5 · Per-round evaluation sub-routes

- **Source:** [doc 05 §0 row 5](./mini-lms-v3-05-evaluation-reporting-delivery.md)
- **Why:** Spec calls for `/evaluations/self/[roundId]`, `/evaluations/grade/[roundId]`, `/evaluations/[roundId]/me`. Current single page works but is unwieldy when rounds multiply.
- **Scope:** Split `app/evaluations/page.tsx` into the three sub-routes. Shared form components extracted to `app/evaluations/_components/`.
- **DoD:** Deep links work; URL shareable with mentor.
- **Effort:** M.

### P1-6 · Rubric JSON → editable UI for instructors

- **Source:** [doc 04 §0](./mini-lms-v3-04-assignments-mentoring.md)
- **Why:** `Assignment.rubricJson` is authored by hand-editing JSON. Mentors scoring submissions see raw JSON, not a rubric UI.
- **Scope:** Structured editor (add criterion, weight, scale) producing the same JSON shape the backend already expects; grading view renders the rubric as a scorecard.
- **DoD:** Instructor can author a 3-criterion rubric without touching raw JSON; mentor grades against it and scores persist.
- **Effort:** L.

### P1-7 · `/admin/pairings` dedicated page

- **Source:** [doc 02 §0 row 5](./mini-lms-v3-02-foundation-auth-rbac.md)
- **Why:** Pairings are managed inline inside `app/admin/users/page.tsx`; this does not scale and is hard to audit.
- **Scope:** List pairings with search/filter; add/deactivate; CSV import.
- **DoD:** Admin creates 5 pairings in under a minute; each appears in MENTOR's `/mentees`.
- **Effort:** M. Depends on P0-1 so the server-side check is already in place.

### P1-8 · State-machine validator module

- **Source:** [doc 04 §0](./mini-lms-v3-04-assignments-mentoring.md)
- **Why:** Submission transitions are scattered across server actions. A single `lib/submission-state.ts` with a transition matrix prevents invalid jumps (e.g. `PASSED → DRAFT`).
- **Scope:** Export `canTransition(from, to): boolean` + `transition(sub, to)` that throws on invalid. Replace ad-hoc checks in existing actions.
- **DoD:** All existing submission flows still work; new unit tests cover every legal and illegal transition.
- **Effort:** M. Natural follow-up to P0-3.

### P1-9 · Submission file-type allow-list

- **Source:** [doc 03 §0](./mini-lms-v3-03-content-learning.md) (no file-type lib)
- **Why:** Upload route trusts the client's MIME string. Malicious users can upload arbitrary bytes labelled `image/png`.
- **Scope:** Add `file-type` (or equivalent) to sniff magic bytes server-side; reject mismatches. Allow-list by prefix (covers: images only; submissions: pdf/docx/image; videos: mp4/webm).
- **DoD:** Renaming `malware.exe` to `malware.png` and uploading is rejected with 415.
- **Effort:** S.

---

## §4 P2 — Ops hardening

### P2-1 · Production `docker-compose.yml` with `app` service

- **Source:** [doc 05 §0](./mini-lms-v3-05-evaluation-reporting-delivery.md)
- **Why:** Current [docker-compose.yml](../mini-lms/docker-compose.yml) only defines `db` + `minio` + `minio-init`. No `app` image, so deployment requires manual Node setup.
- **Scope:** Split into `docker-compose.yml` (dev, app built from `Dockerfile.dev` with hot reload) and `docker-compose.prod.yml` (app from multi-stage `Dockerfile`, `NODE_ENV=production`, behind a reverse-proxy placeholder).
- **DoD:** `docker compose -f docker-compose.prod.yml up` on a clean VM produces a running app reachable at `:3000`.
- **Effort:** M.

### P2-2 · Backup cron for Postgres + MinIO

- **Source:** [doc 05 §0](./mini-lms-v3-05-evaluation-reporting-delivery.md)
- **Scope:** A sidecar container or host-level cron that runs nightly `pg_dump` and `mc mirror` of the MinIO bucket to a separate volume / remote. Document restore procedure in `doc/runbook-backup-restore.md`.
- **DoD:** Restore drill succeeds from yesterday's snapshot on a blank DB.
- **Effort:** M.

### P2-3 · Orphan-file GC cron

- **Source:** [doc 03 §0](./mini-lms-v3-03-content-learning.md) / [doc 05 §0](./mini-lms-v3-05-evaluation-reporting-delivery.md)
- **Why:** When a lesson or submission is deleted, its MinIO objects linger.
- **Scope:** Nightly job that lists every object key in allow-listed prefixes, cross-checks against the DB, deletes orphans older than 7 days.
- **DoD:** Seed 3 orphans aged 8+ days; job removes them; a 1-day-old orphan survives.
- **Effort:** M.

### P2-4 · Drop or migrate legacy `SupervisionVideo` table

- **Source:** [doc 05 §0 row 1](./mini-lms-v3-05-evaluation-reporting-delivery.md)
- **Why:** Both `SupervisionVideo` and `ObservationVideo` exist. The former is the legacy name.
- **Scope:** Query all environments → if empty, write a migration to `DROP TABLE`. If not, write a data-copy migration first.
- **DoD:** Only `ObservationVideo` remains in `schema.prisma`; migration committed.
- **Effort:** S (data-empty case) or M (data-copy case). **Do not attempt without confirming no env has rows.**
- **Effort:** S–M.

### P2-5 · Tighten JWT session lifetime + refresh

- **Source:** [doc 02 §0](./mini-lms-v3-02-foundation-auth-rbac.md)
- **Why:** `lib/auth.ts` sets `maxAge: 24 * 60 * 60` (24 h). Spec wants a shorter live-session with refresh behaviour for sensitive roles.
- **Scope:** Consider a rolling session with `updateAge` and a shorter `maxAge` (e.g. 4 h active). Confirm with product before touching.
- **DoD:** Idle session expires at spec'd threshold; active user is not kicked mid-grade.
- **Effort:** S.

### P2-6 · Middleware matcher: explicit → negative pattern

- **Source:** [doc 02 §0](./mini-lms-v3-02-foundation-auth-rbac.md)
- **Why:** Current [middleware.ts](../mini-lms/middleware.ts) matcher explicitly lists protected prefixes. Every new protected route requires editing the matcher; easy to forget.
- **Scope:** Switch to `matcher: ['/((?!api/auth|login|_next/static|_next/image|favicon.ico|public).*)']` and let the middleware body decide what requires a session.
- **DoD:** All existing protected routes still gated; new route added without touching matcher.
- **Effort:** S.

### P2-7 · Presigned URL TTL config

- **Source:** [doc 01 §0](./mini-lms-v3-01-overview-architecture.md)
- **Why:** Hard-coded 15-minute TTL in [lib/minio.ts](../mini-lms/lib/minio.ts). Spec wants this configurable per environment.
- **Scope:** Read from `FILE_PRESIGN_TTL_SECONDS` env var with a 900-second default.
- **DoD:** Local override via `.env` works; code change trivial.
- **Effort:** S.

---

## §5 P3 — Polish & deferred optimisations

| # | Task | Source | Effort |
|---|---|---|:-:|
| P3-1 | Swap hand-rolled PDF bytes for `@react-pdf/renderer`; render Thai names correctly. | [doc 05 §0 row 3](./mini-lms-v3-05-evaluation-reporting-delivery.md) | M |
| P3-2 | Format certificate `issuedAt` in Thai (พ.ศ.) via `Intl.DateTimeFormat("th-TH-u-ca-buddhist")`. | [doc 05 §0 row 4](./mini-lms-v3-05-evaluation-reporting-delivery.md) | S |
| P3-3 | Add `Course.completedCount` / `enrolledCount` cache fields if reports feel slow. Measure first. | [doc 05 §0 row 2](./mini-lms-v3-05-evaluation-reporting-delivery.md) | M |
| P3-4 | Rename `SupervisionVideo` refs in code once P2-4 drops the table. | [doc 05 §0 row 1](./mini-lms-v3-05-evaluation-reporting-delivery.md) | S |
| P3-5 | Migrate `app/` flat routes to route-group structure (`(student)/`, `(mentor)/`, …) **only if** the sidebar work in P1-1 doesn't make the flat tree painful. | [doc 01 §0](./mini-lms-v3-01-overview-architecture.md) | L |
| P3-6 | Normalise Prisma snake_case via explicit `@@map` on every model; currently some models use PascalCase at the SQL level. | [doc 02 §0](./mini-lms-v3-02-foundation-auth-rbac.md) | M |
| P3-7 | Expand `NotificationType` enum to cover mentor-paired events once the notifications UI lands. | [doc 01 §0](./mini-lms-v3-01-overview-architecture.md) | S |
| P3-8 | Investigate if `Course.id` should change from `Int` to `cuid()` for URL opacity. Low priority unless leaking sequential IDs becomes a concern. | [doc 01 §0](./mini-lms-v3-01-overview-architecture.md) | L |

---

## §6 Suggested execution sequence

A reasonable order that keeps each PR reviewable and avoids merge conflicts:

1. **Safety net first:** P0-4 (migrations baseline) → P0-1 (mentor pairing) → P0-2 (file access) → P0-3 (UNDER_REVIEW lock).
2. **User-visible quick wins in parallel lanes:**
   - Lane A (frontend shell): P1-1 sidebar + logout.
   - Lane B (uploads): P1-9 (file-type sniff) → P1-3 (covers) → P1-4 (video 500 MB).
   - Lane C (content): P1-2 (teach lessons list).
3. **Deeper feature work:** P1-5 evaluation routes · P1-8 state-machine module · P1-7 pairings page · P1-6 rubric UI (largest).
4. **Ops pass:** P2-1 prod compose · P2-2 backups · P2-3 GC cron · P2-5 session tuning · P2-6/-7 small tightenings · P2-4 legacy table (last, after checking env data).
5. **Polish:** everything in §5, cherry-picked as bandwidth allows. P3-1 + P3-2 should land before the first certificate is issued to a real Thai-named student.

Dependencies worth restating:
- P0-2 depends on P0-1 (reuses `requireOwnStudent`).
- P1-7 depends on P0-1 (admin UI must exercise the same guard it creates rows for).
- P1-8 cleans up P0-3.
- P3-4 waits on P2-4.

---

## §7 Acceptance checklist (roll-up)

Close this plan once every box below can be ticked:

- [ ] P0-1 `requireOwnStudent` implemented + tested
- [ ] P0-2 File access checked per-prefix
- [ ] P0-3 `UNDER_REVIEW` edit-lock enforced
- [ ] P0-4 `prisma/migrations/` has baseline migration
- [ ] P1-1 Sidebar with logout mounted on every authenticated page
- [ ] P1-2 `/teach/[id]/lessons` list page
- [ ] P1-3 Cover upload works end-to-end
- [ ] P1-4 Video upload ≥ 500 MB works
- [ ] P1-5 Evaluation sub-routes
- [ ] P1-6 Rubric editor + scorecard
- [ ] P1-7 `/admin/pairings` page
- [ ] P1-8 State-machine validator module
- [ ] P1-9 Server-side file-type sniff
- [ ] P2-1..P2-7 ops hardening
- [ ] P3 polish items as scoped

> When a box is ticked, link the merging PR next to it. When all P0/P1 are green, the system is considered "v3 feature-complete."
