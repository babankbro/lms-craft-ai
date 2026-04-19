# 04 · Features

Each subsection names the **module**, the **routes** in `app/`, the **domain helpers** in `lib/`, the **acceptance criteria** drawn from the TOR, and a **status flag** (✅ shipped, 🟡 partial, ⏳ planned).

Last aligned: **2026-04-19**.

## 1. Authentication & RBAC — ✅

- **Routes**: `/login`, `GET|POST /api/auth/[...nextauth]`, `middleware.ts`.
- **Helpers**: `lib/auth.ts`, `lib/permissions.ts` (`requireAuth`, `requireRole`, `canReview`, `canAuthor`, `canManage`, `canAccessStudent`, `requireOwnStudent`).
- **Acceptance**:
  - [x] CredentialsProvider with `bcrypt.compare`
  - [x] JWT stamped with `id`, `role`, `fullName`; 4-hour session, 1-hour rolling refresh
  - [x] Route-level guards in `middleware.ts`
  - [x] Role dispatcher on `/dashboard`

## 2. User management & mentor pairing — ✅

- **Routes**: `/admin/users`, `/admin/users/new`, `/admin/users/[id]`, `/admin/pairings`.
- **Actions**: `createUser`, `updateUserRole`, `assignMentor`, `toggleUserActive`, `importUsersCSV`.
- **Acceptance**:
  - [x] Create / list / filter users
  - [x] Role switching, mentor assignment
  - [x] CSV bulk import
  - [x] `requireOwnStudent(mentorId, studentId)` in `lib/permissions.ts`

## 3. Course authoring — ✅

- **Routes**: `/teach`, `/teach/new`, `/teach/[courseId]`, `/teach/[courseId]/lessons/*`, `/teach/[courseId]/quizzes/*`, `/teach/[courseId]/assignments/*`, `/teach/[courseId]/enrollments`, `/teach/[courseId]/sections`, `/teach/[courseId]/score-config`, `/teach/[courseId]/scores`.
- **Helpers**: `lib/validators/course.ts`, `lib/slug.ts`, `lib/course-score.ts`.
- **Acceptance**:
  - [x] INSTRUCTOR creates / edits / publishes courses
  - [x] Lesson editor with markdown + YouTube embed
  - [x] Cover image upload (`CoverImageUpload` component)
  - [x] Drag-and-drop reordering of lessons (`LessonListSortable`) and sections (`SectionListSortable`)
  - [x] Section CRUD (create, rename, delete, reorder; drag lessons between sections)
  - [x] Dedicated `/teach/[courseId]/lessons` and `/teach/[courseId]/quizzes` list pages
  - [x] Assignment CRUD with structured questions, attachments, maxScore
  - [x] Quiz builder with lesson/section/course placement (`linkQuizTarget`)
  - [x] Score weight configuration (`CourseScoreConfig`, `/teach/[courseId]/score-config`)
  - [x] Student score roster with CSV export (`/teach/[courseId]/scores`)

## 4. Enrollment & student catalog — ✅

- **Routes**: `/courses`, `/courses/[slug]`, `/admin/enrollments`, `/teach/[courseId]/enrollments`.
- **Acceptance**:
  - [x] Catalog with keyword / category / level filters
  - [x] Enrollment request + approval / rejection with reject reason
  - [x] `Course.requiresApproval = false` supports instant enrollment
  - [x] Self-withdrawal from a pending request (`cancelEnrollment` action; `CANCELLED` status)
  - [x] Enrollment notification to admin/instructor on new request

## 5. Learning experience — ✅

- **Routes**: `/courses/[slug]/lessons/[lessonId]`, `/courses/[slug]/quiz/[quizId]`, `/courses/[slug]/assignments/[assignmentId]`.
- **Helpers**: `lib/course-gates.ts`, `lib/scoring.ts`, `lib/submission-state.ts`.
- **Acceptance**:
  - [x] Lesson view with content, YouTube video, attachments, quiz badges
  - [x] Lesson completion tracking; auto-triggers `maybeIssueCertificate`
  - [x] Pre-test / post-test / section gate quiz enforcement
  - [x] Per-lesson quiz type badges (PRE/POST) + attempt state badge
  - [x] Section-level quiz placement (BEFORE / AFTER + `isGate`)
  - [x] Student score breakdown panel on course overview

## 6. Assignments & submissions — ✅

- **Routes**: `/submissions`, `/submissions/[id]`, `/review`, `/review/[id]`, `/courses/[slug]/assignments/[assignmentId]`.
- **State machine** (`lib/submission-state.ts`):
  ```
  DRAFT → SUBMITTED → UNDER_REVIEW → {APPROVED | REVISION_REQUESTED | REJECTED}
  REVISION_REQUESTED → SUBMITTED (reviewCycle += 1)
  SUBMITTED → DRAFT (recall — before dueDate; `canRecallSubmission` guard)
  ```
- **Acceptance**:
  - [x] Lesson-level and course-level assignments
  - [x] Structured questions (TEXT / FILE / BOTH) with `AssignmentQuestion`
  - [x] `SubmissionAnswer` per question, with optional per-answer file attachments
  - [x] MIME-type + size validation on upload
  - [x] Comment thread with `isInternal` flag
  - [x] Mentor scoring + feedback (score + maxScore)
  - [x] `UNDER_REVIEW` edit-lock via `assertEditable()`
  - [x] Recall submission (`recallSubmission` — before deadline)
  - [x] Instructor-uploaded assignment attachments with `AttachmentVisibility`
  - [x] Text answers shown in review page + student submission detail
  - [~] File access-control on `/api/files/[...key]` — preview route enforces pairing; direct route still uses `canReview(role)` (P0-5)

## 7. Mentor dashboard — ✅

- **Routes**: `/mentees`, `/mentees/[studentId]`, `/review`, `/review/[id]`.
- **Acceptance**:
  - [x] Mentee roster filtered by `User.mentorId`
  - [x] Drill-down to student's submissions, progress, evaluation scores
  - [x] Review queue scoped to paired mentees

## 8. Quizzes — ✅

- **Schema**: `Quiz`, `QuizQuestion`, `QuizChoice`, `LessonQuiz`, `SectionQuiz`, `QuizAttempt`, `QuizAnswer`. Course FKs `preTestQuizId` / `postTestQuizId`.
- **Scoring**: `lib/scoring.ts`.
- **Gating**: `lib/course-gates.ts` — `canEnterSection`, `isSectionComplete`, `canAccessLesson`, `canAccessPostTest`.
- **Acceptance**:
  - [x] Multi-choice single-correct questions; configurable attempts; attempt history
  - [x] Gate enforcement via `Quiz.isCourseGate`, `SectionQuiz.isGate`, `SectionQuiz.placement`
  - [x] Course pre-test / post-test binding (10–20 MCQ)
  - [x] Section pre-quiz / post-quiz with placement semantics (2–3 MCQ)
  - [x] `QuizStateBadge` extracted to `app/courses/[slug]/_components/quiz-state-badge.tsx`
  - [x] Per-lesson quiz type badges in teach workbench + course overview `LessonRow`

## 9. Score management — ✅

- **Routes**: `/teach/[courseId]/score-config`, `/teach/[courseId]/scores`.
- **Helper**: `lib/course-score.ts` (`getStudentCourseScore`, `computeWeightedFinal`).
- **Export**: `GET /api/export/course-scores`.
- **Acceptance**:
  - [x] 4 weighted components: lesson quizzes, section quizzes, lesson assignments, course assignments
  - [x] Weights must sum to 100; null components auto-redistribute (see ADR-005)
  - [x] `Assignment.maxScore` for score normalisation
  - [x] Instructor score roster with color-coded final scores
  - [x] Student score breakdown panel on course overview
  - [x] CSV export

## 10. Certificates — ✅

- **Routes**: `/certificates`, `POST /api/certificate/generate`.
- **Helpers**: `lib/certificate.ts` (`checkCourseCompletion`, `maybeIssueCertificate`).
- **Acceptance**:
  - [x] PDF generation; stored in MinIO; one per (user, course)
  - [x] Auto-issue triggered from `markLessonComplete` (fire-and-forget)
  - [x] Explicit student request via "ขอรับเกียรติบัตร" button on course overview
  - [x] Certificate download link shown on course overview

## 11. Evaluation rounds — 🟡

- **Routes**: `/evaluations`, `/admin/evaluations`.
- **Helpers**: `lib/evaluation-stats.ts`.
- **Acceptance**:
  - [x] Admin configures `EvaluationRound` with dates, max score, rubric JSON
  - [x] Peer grading (`Evaluation`) and self-evaluation (`SelfEvaluation`)
  - [x] Round averages for leaderboard
  - [ ] Rubric editor UI (currently raw JSON) — P2

## 12. Observation videos — 🟡

- **Routes**: `/observe`, `/observe/new`, `/observe/[id]`, `/api/observe/videos`.
- **Acceptance**:
  - [x] Upload to MinIO or link YouTube URL
  - [x] Peer scoring with `ObservationScore`
  - [x] Scoped: student sees own; mentor sees mentees'; admin/instructor sees all
  - [ ] 500 MB chunked upload pipeline — P1
  - [ ] `SupervisionVideo` legacy table consolidation — P1

## 13. Reports & leaderboard — ✅

- **Routes**: `/reports/progress`, `/reports/leaderboard`.
- **Acceptance**:
  - [x] Per-student progress (lessons, quizzes, submissions)
  - [x] Group filter on progress report
  - [x] Leaderboard driven by evaluation round averages
  - [x] All exports via `/api/export/*`

## 14. Notifications — ✅

- **Routes**: `/api/notifications` (GET list, PATCH mark-read).
- **Component**: `components/shell/notification-bell.tsx` (desktop sidebar + mobile header).
- **Types**: `SUBMISSION_RECEIVED`, `SUBMISSION_REVIEWED`, `FEEDBACK_RECEIVED`, `REVISION_REQUESTED`, `CERTIFICATE_ISSUED`, `ENROLLMENT_REQUESTED`, `ENROLLMENT_APPROVED`, `ENROLLMENT_REJECTED`.
- **Acceptance**:
  - [x] In-app bell with unread badge
  - [x] Mark-read per-id or mark-all
  - [x] Type-specific icons in dropdown

## 15. Email — 🟡

- **Helper**: `lib/mailer.ts` (nodemailer + `OutboundEmail` queue).
- **Endpoint**: `POST /api/email/flush` (ADMIN only).
- **Templates**: `ENROLLMENT_REQUESTED`, `ENROLLMENT_APPROVED`, `ENROLLMENT_REJECTED`, submission reviewed, revision requested.
- **Acceptance**:
  - [x] Queue table `OutboundEmail` survives process restart
  - [x] SMTP configurable via `SMTP_*` env vars
  - [~] Flush endpoint sends queued emails — triggered manually; no cron yet

## 16. Dashboards — ✅

- **Route**: `/dashboard` — role dispatcher.
- **Variants**: student, instructor, mentor, admin.
- **Acceptance**:
  - [x] Student: enrolled courses + progress + certs + unread notifications
  - [x] Instructor: own courses, pending submissions
  - [x] Mentor: mentees, review queue, upcoming evaluations
  - [x] Admin: KPIs, pending approvals, recent activity

## 17. File storage & presigned URLs — 🟡

- **Helper**: `lib/minio.ts`, `lib/attachment-visibility.ts`.
- **Acceptance**:
  - [x] Upload with purpose-scoped auth + magic-byte MIME sniff (`lib/mime-sniff.ts`)
  - [x] Presigned preview URLs via `/api/files/preview/[...key]`
  - [x] `AttachmentVisibility` enforcement on preview route
  - [~] `/api/files/[...key]` direct route: submissions use role check (not mentor pairing); assignment attachments return 404 (P0-5/P0-6)

## 18. Planned features (Phase 2+)

See `tasks/todo.md` and individual plan files for breakdown.

| Feature | Plan file | Priority |
|---------|-----------|----------|
| Password reset (forgot password) | `tasks/plan_password_reset.md` | P0 |
| User profile settings | `tasks/plan_user_profile.md` | P1 |
| Timed quiz with countdown + auto-submit | `tasks/plan_timed_quiz.md` | P1 |
| Lesson Q&A / Discussion | `tasks/plan_lesson_discussion.md` | P1 |
| Course announcements | `tasks/plan_announcements.md` | P2 |
| Bulk enrollment import (CSV) | `tasks/plan_bulk_enrollment.md` | P2 |
