# Mini LMS v3 — Doc 3/5: Phase 2 — Content Pipeline & Learning

> **Phase window:** Week 2 – Week 4 (≈ Days 10–28)
> **Payment tranche:** Part of §2.1 (70%)
> **Prereq:** Phase 1 complete — 4-role schema live in prod.
> **Last doc↔code sync:** 2026-04-17

---

## 0. As-Built Status (doc↔code drift)

Phase 2 content pipeline is shipped. Divergences:

| # | Design says | Code has | Notes |
|---|---|---|---|
| 1 | Standalone list pages `/teach/[courseId]/lessons` and `/teach/[courseId]/quizzes` with drag-reorder UI (§3.2) | Lesson and quiz lists are rendered **inline on the course workbench** (`app/teach/[courseId]/page.tsx`). Only `lessons/new`, `lessons/[lessonId]`, `quizzes/new`, `quizzes/[quizId]` exist as sub-routes. | No drag-reorder UI. Order is set via the `order` integer field on create/edit. |
| 2 | `/api/upload` accepts `purpose: 'cover' \| 'lessonAttachment' \| 'submission'` to pick a MinIO prefix (§3.3) | `/api/upload` only accepts `prefix` matching regex `^lessons/\d+$`. Requires `canAuthor` (INSTRUCTOR/ADMIN). | STUDENTs **cannot** use `/api/upload` at all. Submission uploads go through a separate server action (`app/courses/[slug]/lessons/[lessonId]/submit/actions.ts`). Cover-image upload path is not wired yet. |
| 3 | Cover images stored at `public/covers/{courseId}.{ext}` (§4.1 item 2) | `Course.coverImageKey` exists but no upload flow currently writes to `public/covers/`. Cover upload UI is not in `app/teach/new/page.tsx`. | Feature is schema-ready, UI-deferred. |
| 4 | MIME magic-byte sniffing via `file-type` npm (§Doc 4 §6.3) | `/api/upload` validates the **declared** MIME against an allowlist only — no magic-byte check. `file-type` is not in `package.json`. | Known hardening gap. Track for a later security pass. |
| 5 | Student-side catalog filters: category / level / search (§5.1) | ✅ Implemented in `app/courses/page.tsx` via `?q=`, `?category=`, `?level=` query params | Matches design. |
| 6 | Server actions list in §6 includes `uploadCoverImage(id, file)`, `reorderLessons(courseId, orderedIds)` | Neither action is implemented in `app/teach/actions.ts` or `app/teach/[courseId]/lessons/actions.ts` | Consequence of (1) and (3). |
| 7 | `Course.publishedAt` + `Lesson.estimatedMinutes` added (§2) | ✅ Present in `prisma/schema.prisma` | Matches. |

---

## 1. Scope

Generalize the content side of the LMS so any INSTRUCTOR can author a course without domain-specific assumptions. STUDENTs enroll, consume lessons, take quizzes, and see real-time progress.

### 1.1 In Scope

- INSTRUCTOR course-authoring UI (`/teach/*`)
- Course metadata: cover image, category, level
- Lesson editor (Markdown + YouTube embed + material attachments)
- Quiz builder (Pre-test, Post-test, Quiz) with question bank
- STUDENT course catalog + enrollment
- Lesson viewer with progress marking
- Quiz taking UI with attempt limits + auto-score
- Real-time progress bar + sidebar checkmarks
- Dashboard: STUDENT "My courses", INSTRUCTOR "My authored courses"

### 1.2 Out of Scope (this phase)

- Assignment upload / review workflow — Doc 4
- Certificate generation — Doc 5
- Evaluation rounds — Doc 5
- Observation video upload — Doc 5
- Full admin reports/exports — Doc 5

---

## 2. Schema Changes

All additive; non-breaking:

```prisma
model Course {
  // existing fields...
  coverImageKey  String?
  category       String?              // free-text; category picker in UI, stored as string
  level          CourseLevel?
  authorId       String?
  author         User?    @relation("CourseAuthor", fields: [authorId], references: [id], onDelete: SetNull)
  publishedAt    DateTime?            // NEW — timestamp of first publish, for "Newly added" filter
}

model Lesson {
  // existing: id, courseId, title, content, youtubeUrl, order, createdAt, updatedAt
  estimatedMinutes Int?                // NEW — optional reading/watching time shown to students
}

// No change: LessonProgress, LessonAttachment, Quiz, QuizQuestion, QuizChoice, LessonQuiz, QuizAttempt, QuizAnswer
```

Migration — additive only:

```sql
ALTER TABLE "Course"  ADD COLUMN "publishedAt" TIMESTAMP;
ALTER TABLE "Lesson"  ADD COLUMN "estimatedMinutes" INTEGER;
```

---

## 3. Routes

### 3.1 STUDENT-facing (exists; polish + rename only)

| Route | Purpose | Change |
|---|---|---|
| `/dashboard` | "My courses" + progress tiles | Filter by role: if STUDENT show enrolled; if INSTRUCTOR show authored |
| `/courses` | Public catalog of published courses | NEW: category + level filters, search |
| `/courses/[slug]` | Course landing — description, lessons list, enroll button | Show author name; show estimated total hours |
| `/courses/[slug]/lessons/[id]` | Lesson viewer | Sidebar progress + "Mark complete" behavior preserved |
| `/courses/[slug]/quiz/[quizId]` | Quiz attempt | Attempt counter, disable if exceeded |

### 3.2 INSTRUCTOR-facing (new group `/teach/*`)

| Route | Purpose |
|---|---|
| `/teach` | List of courses I author (INSTRUCTOR sees own; ADMIN sees all) |
| `/teach/new` | Create course (title, slug, description, category, level, cover image) |
| `/teach/[courseId]` | Course workbench — edit metadata, manage lessons, manage quizzes, publish/unpublish |
| `/teach/[courseId]/lessons` | Lesson list with drag-reorder |
| `/teach/[courseId]/lessons/new` | Create lesson |
| `/teach/[courseId]/lessons/[lessonId]` | Lesson editor — Markdown + YouTube + attachments + estimatedMinutes |
| `/teach/[courseId]/quizzes` | Quiz list for this course |
| `/teach/[courseId]/quizzes/new` | Create quiz |
| `/teach/[courseId]/quizzes/[quizId]` | Quiz editor (questions + choices) |

### 3.3 API

| Route | Method | Purpose |
|---|---|---|
| `/api/upload` | POST | Multipart upload to MinIO (existing) — now accepts `purpose: 'cover'|'lessonAttachment'|'submission'` |
| `/api/files/[...key]` | GET | Presigned GET (existing) — auth check added for non-`public/` keys |

---

## 4. Content Authoring — Acceptance Criteria

### 4.1 US-COURSE-AUTHOR (new)

> As an INSTRUCTOR, I want to create and publish a course without admin help.

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | INSTRUCTOR can create a course; `authorId` auto-set from session | 2.1.2(1) |
| 2 | Cover image uploads to `public/covers/{courseId}.{ext}` (max 2MB, JPG/PNG) | — |
| 3 | Slug auto-generated from title; manual override allowed; uniqueness enforced | — |
| 4 | Unpublished courses invisible to STUDENTs | 2.1.2(1) |
| 5 | On first publish, `publishedAt = now()` is set; unpublish does NOT clear it | — |
| 6 | Courses authored by others are hidden from an INSTRUCTOR's `/teach` list; ADMIN sees all | — |

### 4.2 US-LESSON-EDITOR

> As an INSTRUCTOR, I want to compose a lesson with text, video, and materials.

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | Lesson fields: `title`, `content` (Markdown), `youtubeUrl` (optional), `estimatedMinutes`, `order` | 2.1.2(1)(2) |
| 2 | YouTube URL validated (accepts `watch?v=`, `youtu.be/`, embed form); rendered as iframe | 2.1.2(2) |
| 3 | Markdown renders with Shiki code highlighting | 2.1.2(2) |
| 4 | Drag-reorder lessons; `order` updated atomically | — |
| 5 | Attach materials (PDF/DOCX/XLSX/PNG/JPG, max 10MB each); stored at `lessons/{lessonId}/` | 2.1.2(2) |
| 6 | Delete attachment removes MinIO object AND DB row in a single Server Action | — |

### 4.3 US-QUIZ-BUILDER

> As an INSTRUCTOR, I want to build Pre-test, Post-test, and Quiz assessments tied to lessons.

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | Quiz types: `PRE_TEST`, `POST_TEST`, `QUIZ` | 2.1.2(3) |
| 2 | Fields: `title`, `type`, `maxAttempts` (0 = unlimited), `passingScore` (%) | 2.1.2(3) |
| 3 | Questions have `text`, `points` (default 1), `order`; ≥ 2 choices per question | 2.1.2(3) |
| 4 | At least one choice per question marked `isCorrect` | 2.1.2(3) |
| 5 | Quiz attaches to one or more lessons via `LessonQuiz` | — |
| 6 | Delete question cascades to choices; delete quiz blocked if attempts exist (soft-archive flag) | — |

---

## 5. Learner Experience — Acceptance Criteria

### 5.1 US-CATALOG (enhanced)

> As anyone (logged in), I can browse all published courses.

| # | Criterion |
|---|-----------|
| 1 | Grid view: cover image + title + category + level + author name + lesson count |
| 2 | Filter by category (client-side chips), level, search by title |
| 3 | Enrolled courses show a "Resume" button instead of "Enroll" |
| 4 | Unauthenticated users see catalog read-only but cannot enroll |

### 5.2 US-ENROLL

> As a STUDENT (or any role), I can enroll in a published course.

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | Click "Enroll" creates an `Enrollment` row (unique per user+course) | 2.1.3 CAT(2) |
| 2 | Course appears in "My Courses" on `/dashboard` | 2.1.3 CAT(1) |
| 3 | Re-clicking "Enroll" is a no-op (not an error) | — |

### 5.3 US-LESSON-VIEW

> As a STUDENT, I can read a lesson and have progress tracked in real time.

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | Lesson sidebar lists all lessons, current highlighted, completed shown ✅ | 2.1.2(4) |
| 2 | Scrolling past the content end + clicking "Mark complete" creates/updates `LessonProgress` | 2.1.2(4) |
| 3 | Progress bar on course page shows `completedLessons / totalLessons × 100` | 2.1.2(4) |
| 4 | Completion triggers no side-effects yet (certificate lands in Doc 5) | — |
| 5 | Lesson attachments listed at the bottom with filename + size + download button | 2.1.2(2) |

### 5.4 US-QUIZ-TAKE

> As a STUDENT, I can take a quiz and see my auto-calculated score.

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | Quiz page lists all questions with choice radios | 2.1.2(3) |
| 2 | Submit creates `QuizAttempt` + per-question `QuizAnswer` rows atomically | 2.1.2(3) |
| 3 | Score = sum of points on correct answers; `percentage = score / totalPoints × 100` | 2.1.2(3) |
| 4 | `isPassed = percentage >= passingScore` | 2.1.2(3) |
| 5 | Result page shows score, pass/fail, per-question correctness breakdown | 2.1.2(3) |
| 6 | If `maxAttempts > 0` and `attemptNo >= maxAttempts`, Start button is disabled with reason | — |
| 7 | Pre-test does NOT block progress; Post-test + all QUIZes pass required for completion (Doc 5 gating) | 2.1.2(6) |

---

## 6. Server Actions & Route Handlers

```ts
// app/teach/actions.ts           (INSTRUCTOR, ADMIN)
createCourse(data)          updateCourse(id, data)     publishCourse(id, flag)
deleteCourse(id)            uploadCoverImage(id, file)

createLesson(courseId, d)   updateLesson(id, d)        deleteLesson(id)
reorderLessons(courseId, orderedIds)
uploadLessonAttachment(lessonId, file)   deleteLessonAttachment(id)

createQuiz(courseId, d)     updateQuiz(id, d)          deleteQuiz(id)
addQuestion(quizId, d)      updateQuestion(id, d)      deleteQuestion(id)
addChoice(questionId, d)    updateChoice(id, d)        deleteChoice(id)
attachQuizToLesson(quizId, lessonId)                   detachQuizFromLesson(quizId, lessonId)

// app/courses/actions.ts         (STUDENT + any authenticated)
enroll(courseId)            unenroll(courseId)
markLessonComplete(lessonId)
submitQuizAttempt(quizId, answers[])
```

**Every action:**
- `requireAuth()` at minimum; authoring actions add `requireRole("INSTRUCTOR","ADMIN")`.
- Authoring actions also verify `course.authorId === session.user.id || role === "ADMIN"` to prevent one instructor editing another's course.
- Mutations use Prisma transactions when touching multiple tables (e.g. `submitQuizAttempt` creates 1 attempt + N answers).

---

## 7. UI Components to Build / Reuse

| Component | Status |
|---|---|
| `<MarkdownRenderer>` | reuse from v2 |
| `<YoutubePlayer>` | reuse |
| `<FileUploadDropzone>` | reuse |
| `<CourseCard>` | NEW — cover + title + meta |
| `<CourseFilters>` | NEW — category chips + level select + search |
| `<LessonSidebar>` | refactor — extract from current page into component |
| `<QuizEditor>` | NEW — question list + choice editor |
| `<QuizTaker>` | NEW — read-only render + submit flow |
| `<ProgressBar>` | NEW small primitive; used on course card + inside course page |

---

## 8. Tests

### 8.1 Unit

| File | What |
|---|---|
| `tests/unit/slug.test.ts` | (existing) + new cases for Thai titles |
| `tests/unit/youtube.test.ts` | (existing) — add `youtu.be` short form |
| `tests/unit/scoring.test.ts` | (existing) — verify percentage + isPassed boundary (exactly == passing) |
| `tests/unit/quiz-validator.test.ts` | NEW — reject quiz with no correct answer; reject question with < 2 choices |
| `tests/unit/course-access.test.ts` | NEW — `canEditCourse(session, course)` table |

### 8.2 Integration

| File | What |
|---|---|
| `tests/integration/courses.test.ts` | (existing) adapted to 4 roles |
| `tests/integration/quizzes.test.ts` | (existing) adapted |
| `tests/integration/lesson-progress.test.ts` | NEW — markComplete idempotency; progress aggregate |
| `tests/integration/authoring.test.ts` | NEW — INSTRUCTOR A cannot edit INSTRUCTOR B's course |

### 8.3 E2E

| File | Flow |
|---|---|
| `tests/e2e/authoring.spec.ts` | INSTRUCTOR logs in → creates course → adds 2 lessons + 1 quiz → publishes → STUDENT enrolls & completes one lesson |
| `tests/e2e/quiz-attempt.spec.ts` | STUDENT attempts quiz, passes, sees result; retries blocked after maxAttempts |

---

## 9. Deliverables Checklist

- [ ] Prisma migration with `coverImageKey`, `category`, `level`, `authorId`, `publishedAt`, `estimatedMinutes`
- [ ] `/teach/*` route group with layout + role guard
- [ ] Cover image upload wired to `public/covers/`
- [ ] Drag-reorder for lessons (dnd-kit)
- [ ] Quiz editor + taker components
- [ ] Catalog filters (category/level/search)
- [ ] Updated dashboard per role (STUDENT = my courses, INSTRUCTOR = authored)
- [ ] Tests in §8 green

---

## 10. Risks & Notes

- **Slug collisions across INSTRUCTORs** — enforce global slug uniqueness (current behavior). If that becomes painful, switch to `{author}/{slug}` pathing in a future minor release.
- **Drag-reorder races** — on reorder-save, compute new `order` values in a single transaction; reject if any row's `updatedAt` changed since list load (optimistic lock).
- **MinIO presigned URL scope** — `public/covers/*` is anonymous-read; all other keys require auth-check in `/api/files/[...key]`. Add a test that a STUDENT cannot fetch another user's submission file by guessing the key (preview for Doc 4).
- **Markdown XSS** — use `react-markdown` with the default HTML disabled (already v2 default). Add a unit test asserting a `<script>` tag in Markdown does not render as a DOM script.

---

**Prev ← [Doc 2: Foundation & Auth/RBAC](./mini-lms-v3-02-foundation-auth-rbac.md)**
**Next → [Doc 4: Assignments, Submissions & Mentoring](./mini-lms-v3-04-assignments-mentoring.md)**
