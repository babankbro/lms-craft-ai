# 04 · Features

Each subsection names the **module**, the **routes** in `mini-lms/app/`, the **domain helpers** in `lib/`, the **acceptance criteria** drawn from the TOR, and a **status flag** (✅ shipped, 🟡 partial, ⏳ planned).

## 1. Authentication & RBAC — ✅

- **Routes**: `/login`, `GET|POST /api/auth/[...nextauth]`, `middleware.ts`.
- **Helpers**: `lib/auth.ts` (NextAuth config), `lib/permissions.ts` (`requireAuth`, `requireRole`, `canReview`, `canAuthor`, `canManage`, `canAccessStudent`, `requireOwnStudent`).
- **Acceptance**:
  - [x] CredentialsProvider with `bcrypt.compare`
  - [x] JWT stamped with `id`, `role`, `fullName`
  - [x] 4-hour session, 1-hour rolling refresh
  - [x] Route-level guards in `middleware.ts` for `/admin`, `/teach`, `/review`, `/mentees`, `/observe`
  - [x] Role dispatcher on `/dashboard`

## 2. User management & mentor pairing — ✅ (one stub)

- **Routes**: `/admin/users`, `/admin/users/new`, `/admin/users/[id]`, `/admin/pairings`.
- **Components**: `_components/role-select.tsx`, `_components/mentor-select.tsx` (client components — see archived `v3-09-admin-ux.md` for the Server-Component-event-handler root-cause fix that introduced these).
- **Actions**: `createUser`, `updateUserRole`, `assignMentor`, `toggleUserActive`, `importUsersCSV`.
- **Acceptance**:
  - [x] Create / list / filter users
  - [x] Role switching via dropdown
  - [x] Mentor assignment inline
  - [x] CSV bulk import
  - [x] `requireOwnStudent(mentorId, studentId)` implemented in `lib/permissions.ts` — throws `ForbiddenError` when mentor is not paired with the student

## 3. Course authoring — 🟡

- **Routes**: `/teach`, `/teach/new`, `/teach/[courseId]`, `/teach/[courseId]/lessons/new|[lessonId]`, `/teach/[courseId]/quizzes/new|[quizId]`, `/teach/[courseId]/assignments`, `/teach/[courseId]/assignments/new|[id]`, `/teach/[courseId]/enrollments`.
- **Helpers**: `lib/validators/course.ts`, `lib/slug.ts`.
- **Acceptance**:
  - [x] INSTRUCTOR creates / edits / publishes courses
  - [x] Lesson editor with markdown (`components/markdown-renderer.tsx`) + YouTube embed (`components/youtube-player.tsx`)
  - [x] Attachments panel (`app/admin/courses/[id]/lessons/[lessonId]/_components/attachments-panel.tsx`)
  - [x] Quiz builder (question + choice CRUD)
  - [x] Assignment CRUD
  - [ ] Drag-and-drop reordering of lessons / sections — P1
  - [ ] Cover image upload UI — P1
  - [ ] Dedicated lesson / quiz list pages (currently inline on course page) — P2

## 4. Enrollment & student catalog — 🟡

- **Routes**: `/courses` (student catalog), `/courses/[slug]` (course detail + sidebar), `/admin/enrollments`, `/teach/[courseId]/enrollments`.
- **Flow**: Student clicks "Request enrollment" → `Enrollment.status = PENDING` → admin/instructor approves via `/admin/enrollments` → status `APPROVED` → student gains access. Rejection captures `rejectReason`.
- **Acceptance**:
  - [x] Catalog listing with category / level filters
  - [x] Enrollment request + approval / rejection UI
  - [x] Rejection reason captured and surfaced to student
  - [x] `Course.requiresApproval = false` supports instant enrollment
  - [ ] Self-withdrawal from a pending request — see [07-backlog.md](./07-backlog.md)

## 5. Learning experience — ✅

- **Routes**: `/courses/[slug]/lessons/[lessonId]`, `/courses/[slug]/quiz/[quizId]`.
- **Helpers**: `lib/course-gates.ts`, `lib/scoring.ts`, `lib/submission-state.ts`.
- **Components**: `course-sidebar.tsx`, `assignment-panel.tsx`, `quiz-banner.tsx`, `quiz-taker.tsx`.
- **Acceptance**:
  - [x] Lesson view with content, video, attachments, quiz banner, assignment panel
  - [x] Lesson completion tracking (`LessonProgress`)
  - [x] Inline quiz taking with attempt tracking
  - [x] Pre-test / post-test type support
  - [x] Course-gate quizzes block further access when `isCourseGate = true`

## 6. Assignments & submissions — 🟡

- **Routes**: `/submissions`, `/submissions/[id]`, `/review`, `/review/[id]`.
- **State machine** (`lib/submission-state.ts`):
  ```
  DRAFT → SUBMITTED → UNDER_REVIEW → {APPROVED | REVISION_REQUESTED | REJECTED}
  REVISION_REQUESTED → SUBMITTED (reviewCycle += 1)
  ```
- **Acceptance**:
  - [x] Student uploads one or many files per submission (`SubmissionFile`)
  - [x] MIME-type + size validation on upload (header allow-list)
  - [x] Comment thread with `isInternal` flag
  - [x] Mentor scoring + feedback
  - [x] First-submission timestamp preserved across revisions
  - [x] **`UNDER_REVIEW` edit-lock** — `lib/submission-state.ts::assertEditable()` throws when status ∈ `{UNDER_REVIEW, APPROVED, REJECTED}`; wired into `attachSubmissionFile` / `removeSubmissionFile`
  - [x] **Admin-uploaded assignment attachments** (`AssignmentAttachment` + `AttachmentUploadPanel` at `/teach/[courseId]/assignments/[id]`)
  - [~] **Per-submission file access-control** — `/api/files/preview` enforces owner/mentor-of-author/instructor-of-course/ADMIN; `/api/files/[...key]` currently falls back to `canReview(role)` without pairing check. See 06 P0-2-follow-up
  - [ ] `file-type` magic-byte MIME sniffing (currently trusts `Content-Type`) — 06 P0-4
  - [ ] `AttachmentVisibility` enforcement on the non-preview download route (`/api/files/[...key]` returns 404 for `assignments/*`) — 06 P0-2-follow-up

## 7. Mentor dashboard — ✅

- **Routes**: `/mentees`, `/mentees/[studentId]`, `/review`, `/review/[id]`.
- **Acceptance**:
  - [x] List of mentor's assigned students (filtered by `User.mentorId`)
  - [x] Drill-down to student's submissions, progress, evaluation scores
  - [x] Review queue scoped to mentor's mentees (pending full `requireOwnStudent` wire-up — see §2)

## 8. Quizzes — ✅

- **Schema**: `Quiz`, `QuizQuestion`, `QuizChoice`, `LessonQuiz`, `SectionQuiz` (with `placement: BEFORE|AFTER`), `QuizAttempt`, `QuizAnswer`. Course has direct `preTestQuizId` / `postTestQuizId` FKs.
- **Types**: `PRE_TEST` (diagnostic, non-gating), `POST_TEST` (post-course gating), `QUIZ` (generic).
- **Scoring**: `lib/scoring.ts` — sum of points for correct choices, percentage vs total, pass/fail vs `passingScore` (default 60%).
- **Gating** (`lib/course-gates.ts`): `canEnterSection()` checks `BEFORE` gates; `isSectionComplete()` checks only `AFTER` gates; `canAccessLesson()` combines both. `canAccessPostTest()` checks all prior sections complete before course post-test unlocks.
- **Validators** (`lib/validators/quiz.ts`): `courseQuizSchema` enforces `COURSE_QUIZ_MIN..MAX` (defaults 10..20); `sectionQuizSchema` enforces `SECTION_QUIZ_MIN..MAX` (defaults 2..3). All four bounds are env-overridable via `QUIZ_COURSE_MIN/MAX`, `QUIZ_SECTION_MIN/MAX`.
- **Acceptance**:
  - [x] Multi-choice single-correct questions
  - [x] Configurable attempts (`maxAttempts = 0` means unlimited)
  - [x] Attempt history per student
  - [x] Gate enforcement via `Quiz.isCourseGate`, `SectionQuiz.isGate`, `SectionQuiz.placement`
  - [x] **Course Pre-Test / Post-Test binding** (10–20 MCQ, `Course.preTestQuizId` / `postTestQuizId` FKs)
  - [x] **Section Pre-quiz / Post-quiz with placement semantics** (2–3 MCQ) — `SectionQuiz.placement = BEFORE|AFTER`
  - [x] **Course sidebar quiz-state UI** — state badge inline in `app/courses/[slug]/page.tsx` with 4 states (locked / in-progress / passed / retake)
  - [ ] Extract `QuizStateBadge` into its own component file — cosmetic cleanup
  - [ ] Free-form / short-answer questions — out of scope (tracked as P3-1)

## 9. Certificates — 🟡

- **Routes**: `/certificates`, `POST /api/certificate/generate`.
- **Helpers**: `lib/certificate.ts`.
- **Acceptance**:
  - [x] PDF generation on completion
  - [x] Stored in MinIO via fileKey
  - [x] One certificate per (user, course) — enforced by unique index
  - [x] Auto-issue triggered when the final gate passes
  - [ ] `@react-pdf/renderer` upgrade (currently hand-rolled PDF) — P2

## 10. Evaluation rounds — 🟡

- **Routes**: `/evaluations`, `/admin/evaluations`.
- **Helpers**: `lib/evaluation-stats.ts`.
- **Acceptance**:
  - [x] Admin configures `EvaluationRound` with start / end dates, max score, rubric JSON
  - [x] Evaluees graded by peers (`Evaluation`, unique per evaluator+evaluatee+round)
  - [x] Self-evaluation (`SelfEvaluation`, unique per user+round)
  - [x] Round averages computed for leaderboard
  - [ ] Rubric editor UI (currently raw JSON) — P2

## 11. Observation videos — 🟡

- **Routes**: `/observe`, `/observe/new`, `/observe/[id]`, `/api/observe/videos`.
- **Upload targets**: MinIO (via `/api/upload?purpose=videos`) or YouTube URL (parsed by `lib/youtube.ts`).
- **Acceptance**:
  - [x] Mentor / instructor uploads or links a video
  - [x] Peer scoring with `ObservationScore` (Int score, feedback text, unique per evaluator)
  - [x] Playback on `/observe/[id]` via `youtube-player.tsx` or presigned MinIO URL
  - [ ] 500 MB file-upload pipeline hardening (chunked, resumable) — P1
  - [ ] Legacy `SupervisionVideo` table consolidation into `ObservationVideo` — P2

## 12. Reports & leaderboard — ✅

- **Routes**: `/reports/progress`, `/reports/leaderboard`.
- **Helpers**: `lib/evaluation-stats.ts`.
- **Acceptance**:
  - [x] Progress report per student (lessons completed, quiz scores, submissions status)
  - [x] Leaderboard top-N per group, driven by evaluation round averages
  - [x] Exports available via `/api/export/*`

## 13. Notifications — ✅

- **Routes**: `/api/notifications` (GET list, PATCH mark-read).
- **Triggers** (enum `NotificationType`):
  - SUBMISSION_RECEIVED, SUBMISSION_REVIEWED, FEEDBACK_RECEIVED, REVISION_REQUESTED
  - CERTIFICATE_ISSUED
  - ENROLLMENT_REQUESTED, ENROLLMENT_APPROVED, ENROLLMENT_REJECTED
- **Acceptance**:
  - [x] In-app bell / unread badge
  - [x] Deep-link via `Notification.link`
  - [x] Mark-read (per-id or mark-all)
  - [ ] Email delivery (SMTP integration) — out of current scope

## 14. Dashboards — ✅

- **Route**: `/dashboard` — role dispatcher rendering one of the `_components/*-dashboard.tsx` variants.
- **Variants**: `admin-dashboard`, `instructor-dashboard`, `mentor-dashboard`, `student-dashboard` (plus legacy `cam`, `cat`, `researcher`, `researcher` variants from v2 that remain as components but are not routed).
- **Acceptance**:
  - [x] Admin sees KPIs, recent activity, pending approvals
  - [x] Instructor sees own courses, pending submissions
  - [x] Mentor sees mentees, review queue, upcoming evaluation rounds
  - [x] Student sees enrolled courses, assignment status, next quiz

## 15. File storage & presigned URLs — ✅

- **Helper**: `lib/minio.ts`.
- **Buckets / prefixes**: single bucket `mini-lms-storage` with prefixes `lessons/`, `covers/`, `submissions/`, `videos/`, `profiles/`, `certificates/`.
- **Presign**: 15 minutes (`FILE_PRESIGN_TTL_SECONDS=900`).
- **Acceptance**:
  - [x] Upload with purpose-scoped auth
  - [x] Presigned preview URLs
  - [x] Download streaming with auth check
  - [x] Delete via `DELETE /api/files/[...key]` with DB cleanup

## 16. Operations & DevEx — 🟡

- **Local infra**: `docker-compose.yml` spins up `postgres:16-alpine` (port 5434) and MinIO (`9002` api / `9003` console). `minio-init` container provisions the bucket and public-download policy.
- **Database scripts**: `npm run db:migrate`, `db:reset`, `db:studio`, `seed`.
- **Testing**: `npm test` (Vitest), `npm run test:e2e` (Playwright — config at `playwright.config.ts`).
- **Acceptance**:
  - [x] Single-command startup (`npm run docker:up && npm run dev`)
  - [x] Seed data covers all roles
  - [x] Health endpoint `/api/health`
  - [ ] Production docker-compose template — P2
  - [ ] Automated DB backups + retention — P2
  - [ ] Orphaned-object GC for MinIO — P2
