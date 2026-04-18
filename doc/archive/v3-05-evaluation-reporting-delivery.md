# Mini LMS v3 — Doc 5/5: Phase 4 — Evaluation, Certificates, Reports & Delivery

> **Phase window:** Week 7 – Week 12 (≈ Days 45–90)
> **Payment tranche:** §2.2 (30% — final milestone at Day 90)
> **Prereq:** Phase 3 complete; assignment review loop working end-to-end.
> **Last doc↔code sync:** 2026-04-17

---

## 0. As-Built Status (doc↔code drift)

Most of Phase 4 is shipped. Remaining gaps are concentrated in deployment, delivery, and a few schema/PDF items:

| # | Design says | Code has | Notes |
|---|---|---|---|
| 1 | `SupervisionVideo` renamed to `ObservationVideo` (§2.2, §2.4) | Both models coexist in `prisma/schema.prisma`. `SupervisionVideo` was preserved; `ObservationVideo` + `ObservationScore` were added as new tables. | No `ALTER TABLE "SupervisionVideo" RENAME …` migration exists. If the legacy table is empty in all environments, a follow-up migration should drop it; otherwise data needs copying first. |
| 2 | `Course.completedCount` + `Course.enrolledCount` cache fields (§2.3, §2.4) | Not implemented | Accepted as optional. Stats come from live queries in `lib/evaluation-stats.ts` and report pages. |
| 3 | PDF rendered via `@react-pdf/renderer` (§3.3) | Hand-written PDF bytes in `lib/certificate.ts` — raw `%PDF-1.4` with Helvetica, single page, English labels | Output satisfies TOR but is brittle (no layout engine, no Thai font). Plan a `@react-pdf/renderer` swap post-acceptance if Thai names don't render acceptably. |
| 4 | `issuedAt` formatted in Thai / Gregorian (§3.3) | `.toLocaleDateString("en-GB")` → `DD/MM/YYYY`, Gregorian. No Thai formatting. | Acceptable for v3; note for UAT review. |
| 5 | Evaluation routes `/evaluations/self/[roundId]`, `/evaluations/grade/[roundId]`, `/evaluations/[roundId]/me` (§4.1) | Single page `app/evaluations/page.tsx` renders all active rounds with role-aware inline forms (self-eval for STUDENT, grade form for MENTOR/INSTRUCTOR/ADMIN) | No per-round sub-routes. Functionally equivalent; UX is a long page rather than navigation-driven. |
| 6 | `rubricJson` rendered as a structured scoring grid (§4.2) | `EvaluationRound.rubricJson` column exists in schema, but no UI renderer. Admin form does not collect rubric JSON; grading form is a single score field. | Feature is schema-ready, UI-deferred. |
| 7 | Observation video list path `/observe` (§5.2) | ✅ `app/observe/page.tsx`, `app/observe/new/page.tsx`, `app/observe/[id]/page.tsx` exist | Matches. |
| 8 | Observation video 500 MB upload with resumable retry (§5.3) | `/api/upload` has a 10MB limit (`MAX_FILE_SIZE = 10 * 1024 * 1024`) and disallows the `videos/` prefix (regex only accepts `lessons/\d+`). | **Not yet wired end-to-end for videos.** Either a dedicated `/api/observe/upload` is needed, or `/api/upload` must be extended. Check `app/api/observe/videos/route.ts` — it exists but only handles metadata, not large-file upload. |
| 9 | Export endpoints (§7.1): `users`, `enrollments`, `quiz-attempts`, `submissions`, `evaluation-scores`, `completion` | ✅ All six routes present in `app/api/export/` | Matches. |
| 10 | Export streaming (no in-memory full-table buffering) (§7.2) | Not confirmed; `xlsx` SheetJS default is in-memory. Assume current impl buffers. | Fine for current data volumes; revisit if row counts climb. |
| 11 | Production `docker-compose.prod.yml` with `app` + `nginx` + `backup` services (§8.1) | Only `docker-compose.yml` (dev) exists — has `db`, `minio`, `minio-init`; **no `app` service, no `nginx`, no `backup`**. Dev MinIO ports are `9002:9000` and `9003:9001`; DB is `5434:5432`. | Production deployment artifact is still TODO. |
| 12 | Nightly `pg_dump` + `mc mirror` backups (§8.3) | Not implemented | Deferred. |
| 13 | GC cron for orphaned MinIO objects (§8.4, Doc 4 §11) | Not implemented | Deferred. |
| 14 | `/api/health` returns DB + MinIO connectivity (§8.5) | ✅ `app/api/health/route.ts` exists | Verify it actually probes both before UAT. |
| 15 | UAT seed `scripts/seed-uat.ts` (§9.1) | `prisma/seed.ts` exists; no separate `seed-uat.ts`. | Check whether the existing seed covers the §9.1 fixture shape. |

---

## 1. Scope

Close out every remaining TOR clause: certificates, evaluations, observation video, dashboards, leaderboard, reports, CSV/Excel exports — plus deployment, backups, docs, and UAT.

### 1.1 In Scope

- Certificate generation (PDF) + download + auto-issue on completion
- Course completion summary + pass-rate stats
- Evaluation rounds (configure, grade, self-evaluate, cumulative average)
- Observation (video) upload + playback + scoring
- Role-adaptive dashboards
- Leaderboard (top 3 per `groupName`)
- Progress comparison reports (individual + group)
- CSV / Excel exports (users, enrollments, quiz attempts, submissions, evaluation scores)
- Deployment (Docker Compose) + backup cron + monitoring hooks
- UAT fixtures + README finalization

### 1.2 Out of Scope

- Email / SMS / chat / SSO / live video (per v2 spec §7)
- Real-time websocket leaderboard (poll-on-focus is sufficient)

---

## 2. Schema Additions

### 2.1 EvaluationRound (existing; extend)

```prisma
model EvaluationRound {
  // existing: id, name, startDate, endDate, maxScore, isActive
  description String?
  rubricJson  Json?     // optional structured rubric [{criterion,weight,maxScore}]
}
```

### 2.2 ObservationVideo (rename from SupervisionVideo)

```prisma
// v2
model SupervisionVideo { ... }

// v3
model ObservationVideo {
  id            String   @id @default(cuid())
  uploaderId    String
  uploader      User     @relation(fields: [uploaderId], references: [id], onDelete: Cascade)
  courseId      String?       // optional — video linked to a course
  course        Course?  @relation(fields: [courseId], references: [id], onDelete: SetNull)
  title         String
  description   String?
  fileKey       String?       // MinIO key (MP4/MOV)
  youtubeUrl    String?       // alternative to file upload
  durationSec   Int?
  createdAt     DateTime @default(now())

  scores        ObservationScore[]
}

model ObservationScore {
  id          String   @id @default(cuid())
  videoId     String
  video       ObservationVideo @relation(fields: [videoId], references: [id], onDelete: Cascade)
  evaluatorId String
  evaluator   User     @relation(fields: [evaluatorId], references: [id], onDelete: Cascade)
  score       Int
  feedback    String?
  createdAt   DateTime @default(now())

  @@unique([videoId, evaluatorId])
}
```

### 2.3 Certificate (existing; no change) + cache fields

Optional micro-optimization:

```prisma
model Course {
  // add cached aggregates — recomputed on certificate-issue
  completedCount Int @default(0)
  enrolledCount  Int @default(0)
}
```

Kept optional; can be replaced with a view if caching proves fragile.

### 2.4 Migration

```sql
BEGIN;

-- EvaluationRound extensions
ALTER TABLE "EvaluationRound"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "rubricJson"  JSONB;

-- Rename SupervisionVideo → ObservationVideo
ALTER TABLE "SupervisionVideo" RENAME TO "ObservationVideo";
-- (Indexes + FKs rename via Prisma migration generation)

-- New ObservationScore table
CREATE TABLE "ObservationScore" (
  "id" TEXT PRIMARY KEY,
  "videoId" TEXT NOT NULL REFERENCES "ObservationVideo"(id) ON DELETE CASCADE,
  "evaluatorId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "score" INTEGER NOT NULL,
  "feedback" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "ObservationScore_unique" UNIQUE ("videoId", "evaluatorId")
);

-- Add courseId link to videos
ALTER TABLE "ObservationVideo"
  ADD COLUMN "courseId" TEXT REFERENCES "Course"(id) ON DELETE SET NULL;

-- Course aggregates
ALTER TABLE "Course"
  ADD COLUMN "completedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "enrolledCount"  INTEGER NOT NULL DEFAULT 0;

COMMIT;
```

---

## 3. Certificates

### 3.1 Completion rule

A STUDENT completes a course when ALL hold:
1. Every `Lesson` in the course has a `LessonProgress.isCompleted=true` for this user
2. The `POST_TEST` quiz (if any) has at least one passing `QuizAttempt` for this user
3. Every `QUIZ`-typed quiz has at least one passing attempt for this user
4. (Pre-test is NOT a completion requirement — per TOR 2.1.2(3))

### 3.2 Issuance flow

- On every `markLessonComplete` and `submitQuizAttempt` action, call `maybeIssueCertificate(userId, courseId)`.
- If the rule above holds AND no `Certificate` row exists for `(userId, courseId)`, generate the PDF, upload to `certificates/{userId}/{courseId}.pdf`, insert the `Certificate` row, enqueue a `CERTIFICATE_ISSUED` notification.

### 3.3 PDF template

Rendered via `@react-pdf/renderer` on the server. Fields pulled from DB:
- `user.fullName`
- `course.title`
- `issuedAt` formatted in Thai (Buddhist calendar optional — keep Gregorian for v3 default)
- certificate `id` as verification code

### 3.4 Routes

| Route | Purpose | Role |
|---|---|---|
| `/certificates` | "My certificates" — cover + title + issuedAt + download | STUDENT (+ ADMIN to view any user's via `/admin/users/[id]/certificates`) |
| `/api/certificate/generate` | POST — (re)generate PDF for `(userId, courseId)` | ADMIN only (STUDENTs get auto-issue; this endpoint is for repair) |
| `/api/files/[...key]` | GET — presigned download for `certificates/{userId}/{courseId}.pdf` — owner or ADMIN | — |

### 3.5 Acceptance

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | Completion check passes only when all rules in §3.1 hold | 2.1.2(6) |
| 2 | PDF contains fullName + courseTitle + date + verification code | 2.1.2(7) |
| 3 | STUDENT sees new certificate on `/certificates` within 5s of triggering completion | — |
| 4 | Notification `CERTIFICATE_ISSUED` fired exactly once per `(user,course)` | — |
| 5 | Re-generation via admin endpoint replaces existing MinIO object and bumps `issuedAt` (with audit log) | — |

### 3.6 Completion summary (`/admin/reports/completion`)

- Table: `course title | enrolled | completed | pass-rate%` (pass-rate = completed/enrolled)
- Filter by course
- "Export CSV" button → `/api/export/completion` (TOR 2.1.2(8))

---

## 4. Evaluation Rounds & Self-Evaluation

### 4.1 Routes

| Route | Purpose | Role |
|---|---|---|
| `/admin/evaluations` | List/create/edit rounds | ADMIN |
| `/evaluations` | "My active rounds" — list rounds currently open | all authenticated |
| `/evaluations/self/[roundId]` | STUDENT self-eval form | STUDENT |
| `/evaluations/grade/[roundId]` | MENTOR/ADMIN grade form — pick a STUDENT, enter score+feedback | MENTOR, INSTRUCTOR, ADMIN |
| `/evaluations/[roundId]/me` | STUDENT's own received + self scores for this round | STUDENT |

### 4.2 Acceptance (existing v2 US-EVAL-01…04, role-renamed)

All criteria carry over from the v2 spec, with substitutions:
- `CAT` → `STUDENT`
- `CAM` → `MENTOR`
- `RESEARCHER` → `ADMIN` for round config; `MENTOR/INSTRUCTOR/ADMIN` for grading

Additional v3 criterion:

| # | Criterion |
|---|-----------|
| 1 | MENTOR can only grade their paired STUDENTs (403 otherwise); INSTRUCTOR + ADMIN can grade any |
| 2 | `rubricJson` (if present) renders as a structured scoring grid; score sums to total |
| 3 | Cumulative average computed on the fly via a Prisma aggregation (not cached) |

### 4.3 Cumulative score computation

```
For a STUDENT U:
  overallAverage  = AVG(Evaluation.score WHERE evaluateeId = U)
  perRoundAverage = AVG(Evaluation.score) GROUP BY roundId
  selfScoreOfRound = SelfEvaluation.score WHERE userId = U, roundId = R
```

Add `lib/evaluation-stats.ts` with pure functions covered by unit tests.

---

## 5. Observation Videos

### 5.1 Upload

- STUDENT uploads MP4/MOV up to **500 MB** OR pastes a YouTube URL.
- Stored at `videos/{uploaderId}/{uuid}.{ext}`.
- Server validates MIME via magic bytes; rejects any non-video file.

### 5.2 Playback + scoring

- MENTOR, INSTRUCTOR, ADMIN see a list at `/observe` (MENTOR scoped to own mentees).
- Detail page at `/observe/[id]` renders HTML5 `<video>` (or YouTube iframe) + scoring panel.
- `ObservationScore` upsert per `(videoId, evaluatorId)` — one score per evaluator per video.

### 5.3 Acceptance

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | Video uploads up to 500MB with progress bar and resumable retry on network hiccup | 2.2.3(1) |
| 2 | YouTube URL alternative works for both upload and playback | 2.2.3(1) |
| 3 | MENTOR sees only videos uploaded by assigned STUDENTs | 2.2.3(2) |
| 4 | Evaluator can enter score + feedback; second save updates existing record (idempotent) | 2.2.3(2) |
| 5 | STUDENT can see scores + feedback given to their video | — |

---

## 6. Dashboards & Leaderboard

### 6.1 Role-adaptive `/dashboard`

| Role | Content |
|---|---|
| STUDENT | My enrolled courses (progress %), pending assignments, recent scores, unread notifications |
| MENTOR | Mentee count, pending submissions count, recent reviews, top 3 mentees by evaluation score |
| INSTRUCTOR | Authored courses (enrollment counts), pending submission reviews on own courses, drafts |
| ADMIN | System KPIs: user counts by role, course publish rate, enrollment trend, completion rate, active rounds |

### 6.2 Leaderboard (TOR 2.2.2(1))

- Route: `/reports/leaderboard`
- Rank by **cumulative evaluation score average**, grouped by `groupName`, top 3 per group.
- Visible to MENTOR, INSTRUCTOR, ADMIN. (STUDENT sees a read-only version on `/dashboard` — "top 3 in my group").
- Real-time = on-demand fetch; pass a "last updated" timestamp; refresh-on-focus.

### 6.3 Progress comparison report (TOR 2.2.2(2))

- Route: `/reports/progress`
- Individual view: pick a STUDENT → full breakdown (lessons, quizzes, submissions, evaluations).
- Group view: multi-select STUDENTs → side-by-side bar chart of averages.
- Filters: `groupName`, MENTOR, course.

---

## 7. Exports (CSV / Excel)

### 7.1 Endpoints

| Endpoint | Role | What |
|---|---|---|
| `/api/export/users` | ADMIN | All users with role + group + active |
| `/api/export/enrollments` | ADMIN | `userId, courseId, enrolledAt, completedAt` |
| `/api/export/quiz-attempts` | ADMIN | Every attempt with per-question breakdown flag |
| `/api/export/submissions` | ADMIN, MENTOR (own scope), INSTRUCTOR (own courses) | status, score, reviewedBy, cycles |
| `/api/export/evaluation-scores` | ADMIN, MENTOR (own scope) | per-round evaluation + self scores |
| `/api/export/completion` | ADMIN | Course pass-rate summary |

### 7.2 Implementation

- Use `xlsx` (SheetJS) for `.xlsx`; flip with `?format=csv` for RFC 4180 CSV.
- Server streams rows — no in-memory full-table buffering (use `xlsx-stream-reader`-style or row-level write).
- Each endpoint enforces its role scope; attempt to export out-of-scope data is 403.

### 7.3 Acceptance

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | Every export listed above downloads successfully with correct columns | 2.1.3 นักวิจัย(4), 2.2.2(3) |
| 2 | Empty data sets produce a header-only file (not an empty file) | — |
| 3 | Export endpoints honor scope rules in §7.1 | — |
| 4 | Export file names include current ISO date | — |

---

## 8. Deployment, Ops & Backups

### 8.1 Docker Compose (prod)

`docker-compose.prod.yml` with services:
- `app` (Next.js production build)
- `postgres` (with persistent volume + `postgres_data` mount)
- `minio` (with persistent volume)
- `nginx` (TLS termination, static asset caching)
- `backup` (periodic job — see §8.3)

### 8.2 Environment

`.env.prod` template committed as `.env.prod.example` with:
- `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- MinIO creds + bucket name + public endpoint
- `NEXT_PUBLIC_APP_ORIGIN`

### 8.3 Backups (TOR 3.3-aligned non-functional)

- Nightly at 02:00 (cron in `backup` service):
  1. `pg_dump` to `/backups/db/{yyyymmdd}.sql.gz`
  2. `mc mirror` MinIO → `/backups/minio/{yyyymmdd}/`
- Retention: 7 daily + 4 weekly + 3 monthly.
- Restore runbook in `README.md`.

### 8.4 Garbage collection (from Doc 4 §11)

Nightly cron:
- Delete MinIO objects under `submissions/` and `videos/` with no matching DB row AND older than 7 days.

### 8.5 Monitoring (minimal)

- Next.js structured logging to stdout (picked up by Docker logs).
- `/api/health` returns DB + MinIO connectivity.
- Manually hit health endpoint from uptime monitor of choice (out of project scope — document for operator).

---

## 9. UAT & Final Acceptance

### 9.1 Fixture set

`scripts/seed-uat.ts` — loads:
- 1 ADMIN, 2 INSTRUCTORs, 3 MENTORs, 20 STUDENTs (across 2 `groupName`s)
- 2 published courses, each with 4 lessons, 1 pre-test + 1 post-test + 1 per-lesson quiz
- 10 assignments across the lessons
- Pre-filled: 5 STUDENTs mid-course, 2 STUDENTs with REVISION_REQUESTED submissions, 1 STUDENT with a certificate
- 1 active evaluation round with partial scores
- 3 observation videos (2 uploaded, 1 YouTube link)

### 9.2 UAT checklist (TOR-traced)

| # | Scenario | TOR Ref | Pass |
|---|---|---|---|
| 1 | ADMIN imports 10 users via CSV; all logs in | 2.1.1(1) | ☐ |
| 2 | STUDENT enrolls, completes lessons, takes Pre/Post/Quiz, receives cert | 2.1.2(1–7) | ☐ |
| 3 | INSTRUCTOR creates a course with cover, lessons, materials, quizzes | 2.1.2(1,2,3) | ☐ |
| 4 | STUDENT uploads assignment; MENTOR reviews + feedback; STUDENT revises | 2.1.2(5), 2.1.3 | ☐ |
| 5 | Notification fires on review complete and on new feedback | 2.1.3 ครู CAT(4) | ☐ |
| 6 | ADMIN configures evaluation round, MENTOR grades mentee, STUDENT self-evaluates | 2.2.1 | ☐ |
| 7 | Leaderboard shows top 3 per group, live | 2.2.2(1) | ☐ |
| 8 | Progress comparison report filterable | 2.2.2(2) | ☐ |
| 9 | CSV + Excel export of each data set download with correct content | 2.1.3 นักวิจัย(4), 2.2.2(3) | ☐ |
| 10 | STUDENT uploads observation video; MENTOR watches + scores | 2.2.3 | ☐ |
| 11 | Session expires after 24h; re-login required | 3.2 | ☐ |
| 12 | Application works on Chrome, Firefox, Safari, Edge desktop | 3.3 | ☐ |

### 9.3 Final deliverables

- [ ] All §9.2 rows check ✅
- [ ] `README.md` final: setup, seed, migration, backup, restore, role model
- [ ] `docs/handover/` folder: architecture diagram (this doc-1 ASCII rendered to PNG), DB ERD, API inventory
- [ ] `docker-compose.prod.yml` tested on a cloud VM
- [ ] Backup script proven with a restore dry-run
- [ ] All tests green (v2 regressions + all new tests from Docs 2-5)
- [ ] Source code archive + a short operator's manual (Thai) handed over

---

## 10. Tests Added in This Phase

### 10.1 Unit

- `tests/unit/certificate-eligibility.test.ts` — §3.1 rule coverage (all pass, missing lesson, missing post-test, pre-test-only, etc.)
- `tests/unit/evaluation-stats.test.ts` — per-round + cumulative averages
- `tests/unit/export-csv.test.ts` — header rows, escaping, empty set handling

### 10.2 Integration

- `tests/integration/certificate-issue.test.ts` — completing a course triggers issuance exactly once
- `tests/integration/observation-score.test.ts` — upsert semantics; scope enforcement
- `tests/integration/leaderboard.test.ts` — group by `groupName`, top 3, tie-break by fullName
- `tests/integration/export-scope.test.ts` — MENTOR cannot export another MENTOR's data

### 10.3 E2E

- `tests/e2e/student-happy-path.spec.ts` — enroll → lessons → quiz → cert download
- `tests/e2e/evaluation-round.spec.ts` — round setup → grade → self-eval → appear on leaderboard
- `tests/e2e/exports.spec.ts` — ADMIN downloads each export, file is non-empty, header matches

---

## 11. Risks & Notes

- **PDF generation on the server** can balloon memory on concurrent issuances. Cap parallelism with a simple queue (`p-limit: 2`) inside `maybeIssueCertificate`.
- **Streaming exports** — `xlsx` SheetJS is not naturally streaming for `.xlsx`. For a generic LMS with tens of thousands of rows, pivot to CSV streaming as the primary format and offer `.xlsx` only when row count < 10k (warn above that).
- **Leaderboard real-time** — pure SSR re-fetch on focus is sufficient for the TOR. If live updates become a requirement, switch to Server-Sent Events (not websockets) — minimal infra change.
- **Video bandwidth** — hosting 500MB videos on the same MinIO can saturate the VM's egress. Document an upgrade path (MinIO on a separate bucket/storage tier; CDN in front for playback).
- **UAT language** — operator manual should be in Thai; the app can stay English-labeled during UAT if the customer prefers. Confirm with Kalasin University's acceptance committee before Day 80.

---

## 12. Final Summary — What v3 Delivers vs v2

| Area | v2 | v3 |
|---|---|---|
| Roles | CAT / CAM / RESEARCHER | STUDENT / MENTOR / INSTRUCTOR / ADMIN |
| Content authoring | Bundled with admin (RESEARCHER) | Split — INSTRUCTOR authors, ADMIN governs |
| Domain terminology | Teacher-training ("school", "supervision") | Generic LMS ("group", "observation") |
| Reviewer workflow | CAM reviews CAT | MENTOR reviews STUDENT (same mechanic, cleaner label) |
| Course metadata | Title + description | +cover, category, level, author, publishedAt |
| TOR 2.1.2 coverage | Full | Full |
| TOR 2.2 coverage | Full | Full |
| Data model changes | — | Additive; existing rows preserved |
| Reusability outside teacher-training | Low | High — drop-in for any training program |

---

**Prev ← [Doc 4: Assignments & Mentoring](./mini-lms-v3-04-assignments-mentoring.md)**
**Index ← [Doc 1: Overview & Architecture](./mini-lms-v3-01-overview-architecture.md)**
