# 03 · API Reference

Everything under `mini-lms/app/api/**/route.ts`. Server actions are **not** listed here — they live colocated with the pages they serve (e.g. `app/admin/users/actions.ts`) and are invoked via the React Server Actions runtime, not HTTP.

All handlers respect the same auth rules as `middleware.ts`: an invalid/absent session returns 401 (or redirects for page routes). Role-scoped handlers additionally verify `session.user.role` via `lib/permissions.ts`.

## Auth

### `GET | POST /api/auth/[...nextauth]`
NextAuth handler. Used for `signIn`, `signOut`, `session`, `csrf`, `providers`, `callback`. Credentials provider only; JWT strategy, 4-hour session, 1-hour rolling refresh. Configured in `lib/auth.ts`.

## File storage (MinIO)

### `POST /api/upload`
Multipart form upload. Implementation: [`app/api/upload/route.ts`](../mini-lms/app/api/upload/route.ts).

Fields:
| Field | Required | Notes |
|-------|----------|-------|
| `file` | yes | Enforced against per-prefix caps and MIME allow-list |
| `prefix` | yes | First path segment picks the config; full string becomes the key root |

Prefix → config (from `PREFIX_CONFIG`):

| Prefix | Max size | Role gate | Allowed MIME types |
|--------|----------|-----------|--------------------|
| `lessons` | 25 MB | INSTRUCTOR \| ADMIN (`needsAuthor`) | PDF, docx, xls/xlsx, ppt/pptx, png, jpeg, text/plain, zip |
| `covers` | 5 MB | INSTRUCTOR \| ADMIN (`needsAuthor`) | png, jpeg, webp, gif |
| `submissions` | 50 MB | any authenticated (`needsAnyAuth`) | PDF, docx, png, jpeg, zip |
| `videos` | 500 MB | any authenticated (`needsAnyAuth`) | video/mp4, webm, quicktime |
| `assignments` | 25 MB | INSTRUCTOR \| ADMIN (`needsAuthor`) | PDF, docx, xls/xlsx, ppt/pptx, png, jpeg, text/plain, zip |

Returns `{ fileKey, fileName, fileSize, mimeType }`. The generated key is `${prefix}/${uuid}_${sanitizedFileName}`.

> **Known gap**: MIME check is header-based (`file.type`) against an allow-list; there is **no magic-byte sniffing**. A renamed `.exe` with a fake `application/pdf` header will pass. See 06 P0-4 (partial).

### `GET /api/files/[...key]`
Implementation: [`app/api/files/[...key]/route.ts`](../mini-lms/app/api/files/[...key]/route.ts). Redirects to a presigned GET URL (TTL `FILE_PRESIGN_TTL_SECONDS`, default 900 s) after an authorisation check keyed off the prefix:

| Prefix | Who can GET |
|--------|-------------|
| `lessons/{lessonId}/…` | INSTRUCTOR/ADMIN unconditionally; otherwise `Enrollment.status = APPROVED` for the course |
| `submissions/{submissionId}/…` | Owner (student) OR any reviewer role (MENTOR/INSTRUCTOR/ADMIN). **Note**: does not currently narrow "mentor" to *mentor-of-author* or "instructor" to *instructor-of-course* — any reviewer role succeeds |
| `videos/{id}/…` | Uploader or any reviewer role. **Note**: parses id as `Int`; `ObservationVideo.id` is `cuid()` String, so the `findUnique` lookup on this path is effectively a no-op for observation videos |
| `covers/…`, `public/…` | Any authenticated user |
| `certificates/…` | Certificate owner or ADMIN |
| anything else (incl. `assignments/…`) | Returns `404 NOT_FOUND` — **assignment attachments are not served via this route**; use `/api/files/preview/[...key]` instead |

### `GET /api/files/preview/[...key]`
Implementation: [`app/api/files/preview/[...key]/route.ts`](../mini-lms/app/api/files/preview/[...key]/route.ts). Returns `{ url }` — a presigned GET URL (same TTL).

- `submissions/…` — ownership check (student=author OR mentor-of-author OR instructor-of-course OR ADMIN).
- `assignments/…` — enforces `AttachmentVisibility` per attachment:
  - `STUDENT_ANYTIME` → any enrolled student
  - `STUDENT_AFTER_SUBMIT` → requires the viewer's `Submission.status != DRAFT` on the parent assignment
  - `STUDENT_AFTER_APPROVED` → requires `Submission.status = APPROVED`
  - `INTERNAL_ONLY` → instructors/admins only; always hidden from students
- Other prefixes mirror the `GET /api/files/[...key]` rules.

### `DELETE /api/files/[...key]`
Not currently implemented as a handler in the file router. Deletion flows via domain-specific server actions (e.g. `deleteAssignment`, `removeSubmissionFile`) which call `deleteByPrefix()` or per-object removes in `lib/minio.ts`.

## Certificates

### `POST /api/certificate/generate`
Body: `{ courseId: number }`. Server verifies the authenticated student has:
- `Enrollment.status = APPROVED` for the course
- All required lessons marked complete (`LessonProgress.isCompleted = true`)
- Required quizzes passed (see `lib/course-gates.ts`)

On success: generates PDF, uploads to MinIO, creates `Certificate` row, returns `{ fileKey, url }`. Idempotent — re-issuing returns the existing row.

## Exports (all XLSX)

Each endpoint returns an `.xlsx` stream (Content-Type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`). All require ADMIN unless noted.

| Path | Columns | Scope |
|------|---------|-------|
| `GET /api/export/users` | id, email, fullName, role, groupName, mentor, isActive, createdAt | ADMIN |
| `GET /api/export/enrollments` | user, course, status, requestedAt, reviewedAt, reviewedBy, rejectReason | ADMIN |
| `GET /api/export/submissions` | student, assignment, lesson, course, status, score, reviewedBy, submittedAt, reviewCycle | ADMIN \| INSTRUCTOR (own courses) |
| `GET /api/export/completion` | student, course, lessonsCompleted, totalLessons, percent, certificateIssuedAt | ADMIN |
| `GET /api/export/quiz-attempts` | student, quiz, attemptNo, score, percentage, isPassed, submittedAt + `pre_score`, `post_score`, `delta` (per student × course) | ADMIN \| INSTRUCTOR |
| `GET /api/export/evaluation-scores` | round, evaluator, evaluatee, score, feedback, createdAt | ADMIN |

All accept optional query string filters (`courseId`, `roundId`, `groupName`, `from`, `to`) — see each handler for details.

## Notifications

### `GET /api/notifications`
Returns current user's notifications, newest first. Query `?unread=1` filters to unread.

### `PATCH /api/notifications`
Body: `{ ids: number[] } | { all: true }`. Marks the given (or all own) notifications as read.

## Observation videos

### `GET /api/observe/videos`
Lists observation videos. MENTOR | INSTRUCTOR | ADMIN. Optional `?courseId=` filter.

### `POST /api/observe/videos`
Creates an `ObservationVideo`. Accepts either `{ fileKey }` (already uploaded via `/api/upload?purpose=videos`) or `{ youtubeUrl }` (parsed via `lib/youtube.ts::extractYouTubeId`).

## Health

### `GET /api/health`
Readiness probe. Checks `SELECT 1` against PostgreSQL and `HeadBucket` against MinIO. Returns `200 { ok: true, db: true, minio: true }` or `503` with per-component status. Safe to call unauthenticated.

## Server actions (by page)

Server actions are TypeScript functions marked `"use server"`, imported and invoked directly from forms / onClick handlers in RSCs. They share the same RBAC helpers (`requireAuth`, `requireRole`, `canAccessStudent`). Representative list — **not exhaustive**, consult the page's `actions.ts` for the current signature.

| Page folder | Actions |
|-------------|---------|
| `app/admin/users/actions.ts` | `createUser`, `updateUserRole`, `assignMentor`, `toggleUserActive`, `importUsersCSV` |
| `app/admin/enrollments/actions.ts` | `approveEnrollment`, `rejectEnrollment`, `revokeEnrollment` |
| `app/admin/evaluations/actions.ts` | `createEvaluationRound`, `updateEvaluationRound`, `activateRound` |
| `app/admin/pairings/actions.ts` | `createPairing`, `deletePairing` |
| `app/teach/.../actions.ts` | `createCourse`, `updateCourse`, `publishCourse`, `createLesson`, `updateLesson`, `reorderLessons`, `createAssignment`, `createQuiz`, `addQuizQuestion`, etc. |
| `app/courses/.../actions.ts` | `requestEnrollment`, `markLessonComplete`, `startQuizAttempt`, `submitQuizAttempt` |
| `app/review/[id]/actions.ts` | `claimSubmission`, `approveSubmission`, `requestRevision`, `rejectSubmission`, `postComment` |
| `app/submissions/[id]/actions.ts` | `saveDraft`, `submit`, `withdrawRevision` |
| `app/evaluations/.../actions.ts` | `submitSelfEvaluation`, `scoreEvaluatee` |
| `app/observe/[id]/actions.ts` | `scoreObservation`, `updateObservationScore` |

## Conventions

1. **Prefer server actions** for mutations on RSC pages. Use API routes only when (a) the call crosses trust boundaries, (b) it's invoked from non-React code (e.g. webhooks, external clients), or (c) the response type is a binary stream (uploads, exports, downloads).
2. **Validation**: all server actions validate input with Zod (`lib/validators/*`). API routes do the same at the handler entry point.
3. **Error shape**: handlers return `{ error: string, code?: string }` with an appropriate HTTP status; server actions `throw` and let Next's action error boundary surface the message.
4. **File keys**: always the full MinIO object key, including the purpose prefix (`lessons/42/…`, `submissions/123/…`). Never store presigned URLs — regenerate them on demand.
