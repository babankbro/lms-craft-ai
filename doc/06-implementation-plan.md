# 06 · Implementation Plan — Canonical

> **Single source of truth** for what has landed, what is open, and what is next.
> Re-aligned with the 2026-04-19 code audit.

## Reading guide

- **Priority**: P0 (security / correctness) → P1 (user-visible gaps) → P2 (ops & polish) → P3 (deferred / optional).
- **Status**: `[ ]` open · `[~]` partial · `[x]` done (verified).
- **DoD**: acceptance criterion that closes the task.

---

## 0. Shipped — Phase 1 (2026-04-16 → 2026-04-18)

### Auth & RBAC
- [x] NextAuth Credentials + JWT (4 h / 1 h rolling) — `lib/auth.ts`
- [x] Route-level role gating — `middleware.ts`
- [x] `requireOwnStudent` fully implemented — `lib/permissions.ts`

### Quiz & assignment
- [x] `QuizPlacement`, `SectionQuiz.placement`, `Course.preTestQuizId/postTestQuizId`, `AssignmentAttachment`, `AssignmentAttachmentKind`, `AttachmentVisibility` — `prisma/schema.prisma`
- [x] `lib/validators/quiz.ts` — course (10–20) + section (2–3) quiz validators
- [x] Placement-aware gating — `lib/course-gates.ts`
- [x] Certificate uses `postTestQuizId` FK + POST_TEST fallback — `lib/certificate.ts`
- [x] `AttachmentUploadPanel` + attachment server actions — `/teach/[courseId]/assignments/[id]`
- [x] `AttachmentVisibility` enforcement on preview — `/api/files/preview/[...key]`
- [x] `/reports/progress` + `/api/export/quiz-attempts` include `pre_score/post_score/delta`
- [x] `lib/minio.ts::deleteByPrefix()` paginated batch delete

### Submission state machine
- [x] `assertEditable()` edit-lock — `lib/submission-state.ts`
- [x] `canRecallSubmission()` + `recallSubmission` action — recall to DRAFT before deadline

### Uploads
- [x] Five upload prefixes with per-prefix size/MIME/role — `/api/upload/route.ts`
- [x] Sanitized key `${prefix}/${uuid}_${safeName}`
- [x] `lib/mime-sniff.ts` — magic-byte MIME validation

---

## 0b. Shipped — Phase 1.5 (2026-04-18 → 2026-04-19)

### Course authoring & UX
- [x] Cover image upload UI — `CoverImageUpload` component in teach workbench (P1-1)
- [x] Drag-reorder lessons via `@dnd-kit/sortable` — `LessonListSortable` (P1-2)
- [x] Drag-reorder sections + move lesson to section — `SectionListSortable` (P1-10)
- [x] Dedicated `/teach/[courseId]/lessons` + `/teach/[courseId]/quizzes` list pages (P1-3)
- [x] `QuizStateBadge` extracted to `app/courses/[slug]/_components/quiz-state-badge.tsx` (P1-11)
- [x] Full section CRUD in admin + teach (P1-10)
- [x] Admin full assignment edit page with questions + attachments (course + lesson-level)
- [x] Admin quiz CRUD pages (new + edit) — self-contained, no teach bounce
- [x] Section ↔ Quiz linking (BEFORE/AFTER + isGate toggle) in admin + teach

### Enrollment & student UX
- [x] Self-withdrawal from pending enrollment (`cancelEnrollment`, `CANCELLED` status) (P1-9)
- [x] `ENROLLMENT_REQUESTED` notification to instructor on new request (P1-13)
- [x] Per-lesson quiz type badges in workbench + course overview `LessonRow`
- [x] Compact assignment cards on course overview + dedicated assignment page
- [x] `estimatedMinutes` + assignment count metadata in `LessonRow`

### Submission & review
- [x] `AssignmentQuestion` + `SubmissionAnswer` models + migration
- [x] Structured questions (TEXT/FILE/BOTH) in assignment builder
- [x] Text answers displayed in review page + student submission detail

### Notifications & certificates
- [x] `NotificationBell` client component in sidebar + mobile header
- [x] `markLessonComplete` triggers `maybeIssueCertificate` fire-and-forget
- [x] "ขอรับเกียรติบัตร" / download CTA on course overview
- [x] Email queue (`OutboundEmail` model + `lib/mailer.ts` + `/api/email/flush`)

### Score management
- [x] `CourseScoreConfig` model + `Assignment.maxScore` field + migration
- [x] `lib/course-score.ts` — `getStudentCourseScore` + `computeWeightedFinal` (null redistribution)
- [x] Score weight config UI — `/teach/[courseId]/score-config`
- [x] `maxScore` field in assignment editor
- [x] Student score roster — `/teach/[courseId]/scores` + CSV export
- [x] Student score breakdown panel — `app/courses/[slug]/_components/score-breakdown.tsx`

---

## 1. P0 — Security & correctness (open)

| ID | Task | Status | DoD |
|----|------|--------|-----|
| P0-5 | Tighten `/api/files/[...key]` for `submissions/*` | [ ] | Replace `canReview(role)` with mentor-of-author + instructor-of-course + ADMIN check (parity with `/api/files/preview`). |
| P0-6 | Serve `assignments/*` on `/api/files/[...key]` with `AttachmentVisibility` | [ ] | Non-preview GET for assignment attachments currently returns 404; redirect to preview or replicate visibility logic. |
| P0-7 | Fix `videos/*` lookup in `/api/files/[...key]` | [ ] | Parse id as string (cuid), not `parseInt`; match `ObservationVideo.id`. |
| P0-8 | Playwright coverage for P0-5 | [ ] | E2E test: student B cannot download student A's submission; unpaired mentor cannot either. |

---

## 2. P1 — User-visible feature gaps (open)

| ID | Task | Status | DoD |
|----|------|--------|-----|
| P1-4 | Evaluation rubric editor (replace raw JSON) | [ ] | Admin builds rubric via form inputs; server generates JSON. |
| P1-5 | Observation-video 500 MB upload pipeline | [ ] | 400 MB upload completes without timeout; partial uploads resume. |
| P1-12 | Consolidate `SupervisionVideo` table into `ObservationVideo` | [ ] | Data migration; legacy model dropped; `/videos` redirects. Unblocks `/api/files/[...key]` videos fix. |
| P1-14 | Bulk approve/reject on `/admin/enrollments` | [ ] | Select-all + reason-per-batch for reject. |
| P1-15 | Password reset flow | [ ] | See `tasks/plan_password_reset.md`. `PasswordResetToken` schema + forgot-password + reset pages + email template. |
| P1-16 | User profile settings page | [ ] | See `tasks/plan_user_profile.md`. Change name + change password at `/settings`. |
| P1-17 | Timed quiz with countdown | [ ] | See `tasks/plan_timed_quiz.md`. `Quiz.timeLimitSec` field + `QuizTimer` client component + auto-submit. |
| P1-18 | Lesson Q&A / Discussion | [ ] | See `tasks/plan_lesson_discussion.md`. `LessonDiscussion` + `DiscussionReply` models + panel on lesson page. |

---

## 3. P2 — Ops & polish (open)

| ID | Task | Status | DoD |
|----|------|--------|-----|
| P2-1 | `docker-compose.prod.yml` (healthchecks, restart, reverse proxy) | [ ] | Template in `deploy/` boots a stable stack on a fresh VPS. |
| P2-2 | Automated PostgreSQL backups + 30-day retention | [ ] | Cron `pg_dump`; restore rehearsal recorded. |
| P2-3 | MinIO orphan-object GC | [ ] | Script lists objects and reconciles against DB; dry-run first. |
| P2-4 | Certificate PDF via `@react-pdf/renderer` | [ ] | Output matches template; snapshot test. |
| P2-5 | Course announcements | [ ] | See `tasks/plan_announcements.md`. `CourseAnnouncement` model + instructor management + student feed + notifications. |
| P2-6 | Bulk enrollment import (CSV) | [ ] | See `tasks/plan_bulk_enrollment.md`. Upload CSV → upsert users → create APPROVED enrollments. |
| P2-7 | Playwright smoke suite (one journey per role) | [ ] | CI runs `test:e2e` and blocks merge on failure. |
| P2-8 | Group-level analytics on `/reports/progress` | [ ] | Cohort roll-up by `User.groupName`; heatmap of completion; XLSX per-group. |
| P2-9 | Light / dark mode toggle in sidebar | [ ] | Toggle sets cookie; respects `prefers-color-scheme` on first load. |

---

## 4. P3 — Deferred / optional

| ID | Task |
|----|------|
| P3-1 | Free-form / short-answer quiz questions |
| P3-2 | Multi-select and ranking quiz item types |
| P3-3 | Course prerequisite graph (`Course → Course`) |
| P3-4 | Webhooks for LTI / third-party gradebook integration |
| P3-5 | Public API tokens (PATs) with scoped read-only access |
| P3-6 | Rubric-driven evaluation grading with per-criterion scores |
| P3-7 | Additional notification channels — LINE, Web Push, daily digest |
| P3-8 | Soft-delete + `AuditLog` |
| P3-9 | `next-intl` i18n scaffolding |

---

## 5. Next phase — Sprint layout

### Sprint 3.1 — Security hardening

1. **P0-5 + P0-6 + P0-7** (single security PR) — replace `canReview(role)` with `canAccessSubmission(viewer, submissionId)`; fix assignment attachment route; fix videos cuid parse.
2. **P0-8** — Playwright coverage for submission access control.
3. **P1-12** — `SupervisionVideo` consolidation + legacy model drop.

### Sprint 3.2 — Missing core UX

4. **P1-15 + P1-16** — Password reset + profile settings (pair naturally; both touch auth/user flow).
5. **P1-17** — Timed quiz.
6. **P1-18** — Lesson Q&A.

### Sprint 3.3 — Institutional ops

7. **P2-5 + P2-6** — Course announcements + bulk enrollment import.
8. **P1-14 + P2-8** — Bulk enrollment approve/reject + group analytics.
9. **P2-1 + P2-2 + P2-7** — Production Docker + DB backups + Playwright CI.

---

## 6. Acceptance checklist (roll-up)

- [ ] All P0 items closed
- [ ] All P1 items closed or explicitly deferred
- [ ] `/api/health` green in prod; automated backups verified
- [ ] Playwright smoke suite green in CI
- [ ] UAT sign-off against `requirement-utf8.txt` clauses §2.1.*, §2.2.*, §3.*

---

## 7. Where the old docs went

- 07-backlog — B-1..B-8 all promoted or merged; file kept as cross-reference.
- 08-quiz-assignment-plan — design rationale preserved; implementation status in §0.
- 09-assignment-plan — course-level assignment design; shipped in Phase 1.5.
