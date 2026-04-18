# 06 · Implementation Plan — Canonical

> **Single source of truth** for what has landed, what is open, and what is next.
> Merges the earlier split across 06-implementation-plan, 07-backlog, and 08-quiz-assignment-plan.
> Re-aligned with the 2026-04-18 code audit — every `[x]` below was verified in `mini-lms/`.

## Reading guide

- **Priority**: P0 (security / correctness) → P1 (user-visible gaps) → P2 (ops & polish) → P3 (deferred / optional).
- **Status**: `[ ]` open · `[~]` partial · `[x]` done (verified).
- **DoD**: what "done" means — the acceptance criterion that closes the task.
- **Ev.**: pointer to the code that closed it (path or symbol), where applicable.

---

## 0. What shipped in Phase 1 (2026-04-16 → 2026-04-18)

Everything in this block was verified against `mini-lms/` on 2026-04-18. Kept here so the history doesn't disappear when items are pruned from the open tables.

### Auth & RBAC
- [x] NextAuth Credentials + JWT (4 h / 1 h rolling) — `lib/auth.ts`
- [x] Route-level role gating — `middleware.ts` (admin/teach/review/mentees/observe)
- [x] `requireOwnStudent(mentorId, studentId)` fully implemented — `lib/permissions.ts:65-73` (was a stub in v3-02)
- [x] `canAccessStudent(viewer, studentId)` — mentor pairing check via `User.mentorId`

### Quiz & assignment (Q-1 … Q-13 from the 08 plan)
- [x] `QuizPlacement`, `SectionQuiz.placement`, `Course.preTestQuizId`, `Course.postTestQuizId`, `AssignmentAttachment`, `AssignmentAttachmentKind`, `AttachmentVisibility` — `prisma/schema.prisma`
- [x] `lib/validators/quiz.ts` — `courseQuizSchema` (10–20) + `sectionQuizSchema` (2–3) with env-overridable bounds
- [x] Placement-aware gating — `lib/course-gates.ts::{canEnterSection, isSectionComplete, canAccessLesson, canAccessPostTest}`
- [x] Certificate verification uses `course.postTestQuizId` FK with POST_TEST fallback — `lib/certificate.ts::checkCourseCompletion`
- [x] `AttachmentUploadPanel` + `createAssignmentAttachment` / `deleteAssignmentAttachment` server actions — `app/teach/[courseId]/assignments/[id]/_components/` + `attachment-actions.ts`
- [x] `assignments/` upload prefix with `needsAuthor: true`, 25 MB cap — `app/api/upload/route.ts`
- [x] `/api/files/preview/[...key]` enforces `AttachmentVisibility` — `app/api/files/preview/[...key]/route.ts`
- [x] `/reports/progress` + `/api/export/quiz-attempts` include `pre_score / post_score / delta`
- [x] `lib/minio.ts::deleteByPrefix()` paginated batch delete
- [x] Course-sidebar quiz state badge (locked/in-progress/passed/retake) — inline in `app/courses/[slug]/page.tsx`

### Submission state machine
- [x] `assertEditable(status)` blocks student writes when status ∈ `{UNDER_REVIEW, APPROVED, REJECTED}` — `lib/submission-state.ts`
- [x] Wired into `attachSubmissionFile` / `removeSubmissionFile` in `/courses/[slug]/lessons/[lessonId]/submit/actions.ts`

### Uploads
- [x] Five upload prefixes (`lessons`, `covers`, `submissions`, `videos`, `assignments`) with per-prefix size/MIME/role — `app/api/upload/route.ts`
- [x] Sanitized key `${prefix}/${uuid}_${safeName}` — prevents Thai-filename encoding issues in S3

### Design system
- [x] Prompt font via `next/font/google` wired into Tailwind `font-sans`
- [x] Admin layout wrapper `max-w-6xl px-6 py-8` — `app/admin/layout.tsx`
- [x] Typography polish (font smoothing, `tracking-tight` headings, `optimizeLegibility`)

### Docs
- [x] Phase-era docs consolidated into seven canonical docs; originals kept under `doc/archive/`

---

## 1. P0 — Security & correctness (open)

| ID | Task | Status | DoD | Ev. |
|----|------|--------|-----|-----|
| P0-4 | Magic-byte MIME sniffing on uploads | [~] | `/api/upload` rejects files whose magic bytes don't match the claimed `file.type`. Vitest fixture with a mislabelled PDF. | Currently: header allow-list only in `app/api/upload/route.ts:78-80`. No `file-type` / magic-byte lib. |
| P0-5 | Tighten `/api/files/[...key]` for `submissions/*` | [ ] | Replace `canReview(role)` with mentor-of-author + instructor-of-course + ADMIN check (parity with `/api/files/preview`). | Today `app/api/files/[...key]/route.ts:44-56` lets any MENTOR read any submission. |
| P0-6 | Serve `assignments/*` on `/api/files/[...key]` with `AttachmentVisibility` | [ ] | Non-preview GET for assignment attachments currently returns 404; either redirect to the preview path or replicate the visibility logic here. | `app/api/files/[...key]/route.ts:83-86` else-branch. |
| P0-7 | Fix `videos/*` lookup in `/api/files/[...key]` | [ ] | Parse id as string (cuid), not `parseInt`; match `ObservationVideo.id`. | `app/api/files/[...key]/route.ts:57-69`. |
| P0-8 | Playwright coverage for P0-2 / P0-5 | [ ] | E2E test proves: student B cannot download student A's submission; unpaired mentor cannot either. | `tests/e2e/` currently has `login`, `courses`, `upload` only. |

P0-1, P0-2, P0-3, P0-4 (allow-list portion) are shipped — see §0.

---

## 2. P1 — User-visible feature gaps (open)

Condenses the previous P1 list plus the relevant items absorbed from 07-backlog (B-1 … B-3).

### 2.1 Authoring UX slice
| ID | Task | Status | DoD |
|----|------|--------|-----|
| P1-1 | Cover-image upload UI on course authoring | [ ] | Instructor uploads via `/api/upload?prefix=covers/<courseId>`; image shown on `/courses` + `/teach/[id]`. |
| P1-2 | Drag-reorder lessons / sections | [ ] | Rows draggable; server action persists new `order` monotonically. Reused by B-2. |
| P1-3 | Dedicated `/teach/[courseId]/lessons` and `/teach/[courseId]/quizzes` list pages | [ ] | Separate routes with paging + bulk actions; current inline list remains until parity. |
| P1-10 | Course-sections authoring UI (create/rename/reorder sections, drag lessons between) | [ ] | Reuses P1-2; students see collapsible groups on `/courses/[slug]`. (Was 07 B-2.) |
| P1-11 | Extract `QuizStateBadge` into its own file under `app/courses/[slug]/_components/` | [ ] | Same four states, identical markup; plain refactor. |

### 2.2 Evaluation + observation slice
| ID | Task | Status | DoD |
|----|------|--------|-----|
| P1-4 | Evaluation rubric editor (replace raw JSON) | [ ] | Admin builds rubric via form inputs; server generates JSON. (Crossover with 07 B-5 for per-criterion scores.) |
| P1-5 | Observation-video 500 MB upload pipeline (chunked/resumable) | [ ] | 400 MB upload completes without timeout; partial uploads resume. |
| P1-12 | Consolidate legacy `SupervisionVideo` rows into `ObservationVideo` | [ ] | Data migration; legacy model dropped; `/videos` routes redirect. (Was P2-5, promoted to P1 because it blocks cleanup of `/api/files/[...key]` videos branch.) |

### 2.3 Notifications & enrollment slice
| ID | Task | Status | DoD |
|----|------|--------|-----|
| P1-6 | Email delivery for `NotificationType` events | [ ] | `lib/mailer.ts` queue-based SMTP sender; configurable via `SMTP_*` envs. |
| P1-7 | `/admin/pairings` enhancements (bulk reassign, CSV export, filter by mentor/group) | [ ] | Pairings page split from `/admin/users`. |
| P1-8 | Light / dark mode toggle in sidebar user menu | [ ] | Toggle sets cookie; respects `prefers-color-scheme` on first load. |
| P1-9 | Self-withdrawal from a pending enrollment request | [ ] | Student sees "Cancel request" on `/courses/[slug]`; moves status to `CANCELLED`; notifies admin queue. (Was 07 B-1.) |
| P1-13 | Producer for `ENROLLMENT_REQUESTED` notification | [ ] | Admins / authoring instructor see a notification on enrolment request; enum already exists. |
| P1-14 | Bulk approve/reject on `/admin/enrollments` with confirm dialog | [ ] | Select-all + reason-per-batch for reject. |

---

## 3. P2 — Ops & polish (open)

| ID | Task | Status | DoD |
|----|------|--------|-----|
| P2-1 | `docker-compose.prod.yml` (healthchecks, restart policies, reverse proxy) | [ ] | Template in `mini-lms/deploy/` boots a stable stack on a fresh VPS. |
| P2-2 | Automated PostgreSQL backups + 30-day retention | [ ] | Cron `pg_dump`; restore rehearsal recorded. |
| P2-3 | MinIO orphan-object GC | [ ] | Script lists objects under each prefix and reconciles against DB; dry-run first, then scheduled delete. |
| P2-4 | Migrate certificate PDF generation to `@react-pdf/renderer` | [ ] | Output matches template; snapshot test. |
| P2-6 | Playwright smoke suite covering one-of-each role journey | [ ] | CI runs `test:e2e` and blocks merge on failure. |
| P2-7 | Group-level analytics on `/reports/progress` | [ ] | Cohort roll-up by `User.groupName`; heatmap of completion; XLSX export per-student + per-group. (Was 07 B-4.) |

---

## 4. P3 — Deferred / optional (forward-looking)

Items here have **designs but no active implementation**. They graduate up when prioritised into a sprint.

| ID | Task |
|----|------|
| P3-1 | Free-form / short-answer quiz questions (new `QuizQuestion.type` + grader UI) |
| P3-2 | Multi-select and ranking quiz item types |
| P3-3 | Course prerequisite graph (`Course → Course`) |
| P3-4 | Webhooks for LTI / third-party gradebook integration |
| P3-5 | Public API tokens (PATs) with scoped read-only access |
| P3-6 | Rubric-driven evaluation grading with per-criterion scores + rubric versioning (was 07 B-5) |
| P3-7 | Additional notification channels — LINE, Web Push, daily digest — with per-user `UserNotificationPrefs` (was 07 B-6) |
| P3-8 | Soft-delete + `AuditLog(model, recordId, actorId, action, diffJson, createdAt)` (was 07 B-7) |
| P3-9 | `next-intl` i18n scaffolding — `th` as default, locale switch flagged off (was 07 B-8) |

---

## 5. Next phase — "Phase 2: Harden & Ship"

Goal: close all P0 gaps, finish the authoring-UX slice, and ship a production-deployable stack.
Exit criteria: green UAT against TOR §2.1.\*, §2.2.\*, §3.\*; Playwright smoke suite green; prod docker template boots cleanly.

Proposed two-sprint decomposition:

### Sprint 2.1 — **Security hardening** (one PR per bullet)

1. **P0-5 + P0-6 + P0-7 + P0-4 (single security PR)**
   - Replace `canReview(role)` with a `canAccessSubmission(viewer, submissionId)` helper in `lib/permissions.ts` — returns true if viewer is `studentId`, or `student.mentorId === viewer.id`, or `viewer` is course author, or ADMIN.
   - Call it from both `/api/files/[...key]` and `/api/files/preview/[...key]` to delete the drift.
   - Add an `assignments/*` branch to `/api/files/[...key]` that delegates to the same `AttachmentVisibility` resolver used by `/api/files/preview/[...key]`. Extract the resolver to `lib/attachment-visibility.ts`.
   - Fix the `videos/*` lookup to use `String` id (`ObservationVideo` is cuid).
   - Add `file-type` package; sniff the first 4100 bytes before streaming to S3; reject when the detected MIME disagrees with the whitelist.
   - **Tests**: Vitest unit for `canAccessSubmission` (owner, paired mentor, unpaired mentor, instructor, admin, anonymous), Vitest unit for MIME-sniff rejection with a `.exe` disguised as `application/pdf`.

2. **P0-8 Playwright coverage**
   - `submission-access.spec.ts` — student A uploads, student B is forbidden; unpaired mentor is forbidden; paired mentor succeeds.
   - `assignment-visibility.spec.ts` — `STUDENT_AFTER_APPROVED` example file blocked until student's submission flips to APPROVED.
   - Wire into `test:e2e` in CI.

3. **P1-12 SupervisionVideo consolidation**
   - Migration: `INSERT INTO observation_videos SELECT …` for `SupervisionVideo` rows.
   - Drop the model from Prisma; add a redirect from `/videos/legacy/:id` if any UI links remain.
   - Removes the confusing dual table and unblocks the `/api/files/[...key]` videos cleanup.

**Sprint 2.1 exit**: all P0 rows are `[x]`; observation-video data path is single-source.

### Sprint 2.2 — **Authoring UX + Ops**

4. **Authoring slice PR** — P1-1 (cover upload), P1-2 (drag-reorder), P1-10 (sections authoring), P1-11 (`QuizStateBadge` extract).
   - Adopt `@dnd-kit/sortable` once; reuse for lessons within a section, sections within a course, and later for rubric criteria.
   - Cover upload: reuse `file-upload-dropzone.tsx`; key under `covers/<courseId>/`.

5. **Dedicated list pages PR** — P1-3 (`/teach/[courseId]/lessons` + `/teach/[courseId]/quizzes`).
   - Keeps inline cards on the overview but adds pagination + bulk publish / delete.

6. **Notifications PR** — P1-6 (email), P1-13 (producer for `ENROLLMENT_REQUESTED`), P1-14 (bulk enrollment actions).
   - Start with `nodemailer` + local Maildev in `docker-compose.yml`.
   - Queue table `OutboundEmail { id, toUserId, templateKey, payloadJson, status, attempts, createdAt, sentAt? }` so delivery survives process restart.

7. **Ops PR** — P2-1 (prod compose), P2-2 (pg_dump cron), P2-3 (MinIO GC dry-run), P2-6 (Playwright smoke CI).

**Sprint 2.2 exit**: UAT-ready. P1 rows either `[x]` or explicitly deferred in writing.

### Nice-to-have follow-ups (Phase 2.5)
- P1-4 rubric editor + P3-6 per-criterion scores can land together once the drag-reorder primitive from Sprint 2.2 exists.
- P1-5 chunked uploads — scope once SupervisionVideo is gone (Sprint 2.1 unblocks it).
- P2-7 group analytics — fold in when someone asks for it (TOR §2.2.4 is satisfied at per-student level today).

---

## 6. Acceptance checklist (roll-up)

- [ ] All P0 items closed
- [ ] All P1 items closed or explicitly deferred in writing
- [ ] `/api/health` green in prod; automated backups verified
- [ ] Playwright smoke suite green in CI
- [ ] UAT sign-off against `requirement-utf8.txt` clauses §2.1.*, §2.2.*, §3.*

---

## 7. Execution sequence (recommended)

1. Sprint 2.1 first — one cross-cutting security PR unblocks everything else and is the smallest blast-radius change.
2. Sprint 2.2 slices can land in parallel tracks once 2.1 is in: authoring UX ≠ notifications ≠ ops.
3. Phase 2.5 items wait for stakeholder sign-off on Phase 2 UAT before pulling in.

---

## 8. Where the old docs went

- Old 07-backlog — B-1/B-2/B-3 promoted into P1-9/P1-10/P1-13/P1-14, B-4 → P2-7, B-5/B-6/B-7/B-8 → P3-6..P3-9. File kept as a thin stub pointing here.
- Old 08-quiz-assignment-plan — design rationale preserved; implementation status now lives in §0 of this doc. File kept for the mermaid user-flow + MinIO layout reference.
