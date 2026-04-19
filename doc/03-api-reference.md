# 03 · API Reference

Everything under `app/api/**/route.ts`. Server actions are **not** listed here — they live colocated with the pages they serve (e.g. `app/admin/users/actions.ts`) and are invoked via the React Server Actions runtime, not HTTP.

All handlers respect the same auth rules as `middleware.ts`: an invalid/absent session returns 401. Role-scoped handlers additionally verify `session.user.role` via `lib/permissions.ts`.

## Auth

### `GET | POST /api/auth/[...nextauth]`
NextAuth handler. Credentials provider only; JWT strategy, 4-hour session, 1-hour rolling refresh. Configured in `lib/auth.ts`.

## File storage (MinIO)

### `POST /api/upload`
Multipart form upload.

Fields: `file` (required), `prefix` (required — first segment picks the config).

Prefix → config:

| Prefix | Max size | Role gate | Allowed MIME types |
|--------|----------|-----------|--------------------|
| `lessons` | 25 MB | INSTRUCTOR \| ADMIN | PDF, docx, xls/xlsx, ppt/pptx, png, jpeg, text/plain, zip |
| `covers` | 5 MB | INSTRUCTOR \| ADMIN | png, jpeg, webp, gif |
| `submissions` | 50 MB | any authenticated | PDF, docx, png, jpeg, zip |
| `videos` | 500 MB | any authenticated | video/mp4, webm, quicktime |
| `assignments` | 25 MB | INSTRUCTOR \| ADMIN | PDF, docx, xls/xlsx, ppt/pptx, png, jpeg, text/plain, zip |

Returns `{ fileKey, fileName, fileSize, mimeType }`. Key format: `${prefix}/${uuid}_${sanitizedFileName}`.

### `GET /api/files/[...key]`
Redirects to a presigned GET URL (TTL 900 s) after an auth check:

| Prefix | Who can GET |
|--------|-------------|
| `lessons/{lessonId}/…` | INSTRUCTOR/ADMIN; or enrolled student (`Enrollment.status = APPROVED`) |
| `submissions/{submissionId}/…` | Owner OR reviewer. **Note**: currently allows any reviewer role, not narrowed to mentor-of-author — tracked as P0-5 |
| `videos/{id}/…` | Uploader or any reviewer role |
| `covers/…` | Any authenticated user |
| `certificates/…` | Certificate owner or ADMIN |
| `assignments/…` | Returns 404 — use `/api/files/preview/[...key]` instead (tracked as P0-6) |

### `GET /api/files/preview/[...key]`
Returns `{ url }` — presigned GET (same TTL).

- `submissions/…` — owner OR mentor-of-author OR instructor-of-course OR ADMIN.
- `assignments/…` — enforces `AttachmentVisibility` via `lib/attachment-visibility.ts`.

## Certificates

### `POST /api/certificate/generate`
Body: `{ courseId: number }`. Verifies enrollment + completion + required quizzes passed. Generates PDF, stores `Certificate` row. Idempotent.

## Exports

All require ADMIN unless noted. Course-scoped exports also allow the course INSTRUCTOR.

| Path | Format | Columns |
|------|--------|---------|
| `GET /api/export/users` | CSV | id, email, fullName, role, groupName, mentor, isActive, createdAt |
| `GET /api/export/enrollments` | CSV | user, course, status, requestedAt, reviewedAt, reviewedBy, rejectReason |
| `GET /api/export/submissions` | CSV | student, assignment, lesson, course, status, score, reviewedBy, submittedAt, reviewCycle |
| `GET /api/export/completion` | CSV | student, course, lessonsCompleted, totalLessons, percent, certificateIssuedAt |
| `GET /api/export/quiz-attempts` | CSV | student, quiz, attemptNo, score, percentage, isPassed, submittedAt, pre_score, post_score, delta |
| `GET /api/export/evaluation-scores` | CSV | round, evaluator, evaluatee, score, feedback, createdAt |
| `GET /api/export/course-scores?courseId=N` | CSV | full_name, email, group, lesson_quiz_score, section_quiz_score, lesson_assignment_score, course_assignment_score, final_score |

Accept optional query filters: `courseId`, `roundId`, `groupName`, `from`, `to`.

## Notifications

### `GET /api/notifications`
Current user's notifications, newest first. `?unread=1` filters to unread.

### `PATCH /api/notifications`
Body: `{ ids: number[] } | { markAll: true }`. Marks notifications as read.

## Observation videos

### `GET /api/observe/videos`
Lists observation videos. MENTOR | INSTRUCTOR | ADMIN. Optional `?courseId=` filter.

### `POST /api/observe/videos`
Creates an `ObservationVideo`. Accepts `{ fileKey }` or `{ youtubeUrl }`.

## Email

### `POST /api/email/flush`
Processes pending `OutboundEmail` rows — sends via SMTP (`lib/mailer.ts`), marks `status = SENT`. ADMIN only. Returns `{ sent, failed }` counts.

## Health

### `GET /api/health`
Readiness probe. Checks PostgreSQL (`SELECT 1`) and MinIO (`HeadBucket`). Returns `200 { ok, db, minio }` or `503`. Unauthenticated.

## Server actions (by page)

Representative list — consult the page's `actions.ts` for current signatures.

| Page folder | Key actions |
|-------------|-------------|
| `app/admin/users/actions.ts` | `createUser`, `updateUserRole`, `assignMentor`, `toggleUserActive`, `importUsersCSV` |
| `app/admin/enrollments/actions.ts` | `approveEnrollment`, `rejectEnrollment`, `revokeEnrollment` |
| `app/admin/evaluations/actions.ts` | `createEvaluationRound`, `updateEvaluationRound`, `activateRound` |
| `app/admin/pairings/actions.ts` | `createPairing`, `deletePairing` |
| `app/teach/actions.ts` | `createCourse`, `updateCourse`, `publishCourse`, `deleteCourse` |
| `app/teach/[courseId]/lessons/actions.ts` | `createLesson`, `updateLesson`, `deleteLesson`, `reorderLessons` |
| `app/teach/[courseId]/quizzes/actions.ts` | `createQuiz`, `updateQuiz`, `deleteQuiz`, `addQuestion`, `deleteQuestion`, `linkQuizTarget` |
| `app/teach/[courseId]/assignments/actions.ts` | `createAssignment`, `updateAssignment` (incl. maxScore), `deleteAssignment` |
| `app/teach/[courseId]/score-config/actions.ts` | `saveScoreConfig` (validates weights sum to 100, upserts `CourseScoreConfig`) |
| `app/teach/[courseId]/enrollments/actions.ts` | `approveEnrollment`, `rejectEnrollment` (instructor-scoped) |
| `app/teach/[courseId]/sections/actions.ts` | `createSection`, `deleteSection`, `moveSectionUp`, `moveSectionDown`, `moveLessonToSection`, `attachSectionQuiz`, `detachSectionQuiz` |
| `app/courses/actions.ts` | `enrollInCourse`, `cancelEnrollment`, `markLessonComplete`, `requestCertificate`, `getCourseProgress` |
| `app/courses/[slug]/lessons/[lessonId]/submit/actions.ts` | `saveDraft`, `submitSubmission`, `recallSubmission` |
| `app/review/[id]/actions.ts` | `claimSubmission`, `approveSubmission`, `requestRevision`, `rejectSubmission`, `postComment` |
| `app/evaluations/actions.ts` | `submitSelfEvaluation`, `scoreEvaluatee` |
| `app/observe/[id]/actions.ts` | `scoreObservation`, `updateObservationScore` |

## Conventions

1. **Prefer server actions** for mutations on RSC pages. API routes only for (a) binary responses (downloads, exports), (b) external webhooks, or (c) calls that cross trust boundaries.
2. **Validation**: all server actions validate with Zod. API routes validate at handler entry.
3. **File keys**: always the full MinIO object key (`lessons/42/…`, `submissions/123/…`). Never store presigned URLs — regenerate on demand.
