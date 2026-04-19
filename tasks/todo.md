# Task List — plan_s01_score_management

## Status: COMPLETE

### T1 — Schema: CourseScoreConfig + Assignment.maxScore
- [x] **T1** — Add `CourseScoreConfig` model + `Assignment.maxScore` field + `prisma migrate dev`

### T2 — Scoring library
- [x] **T2** — `lib/course-score.ts` implementing `getStudentCourseScore(userId, courseId)` + unit tests

### T3 — Instructor score-weight config UI
- [x] **T3a** — `app/teach/[courseId]/score-config/page.tsx` + `actions.ts` + link from workbench
- [x] **T3b** — Add `maxScore` field to assignment edit page in teach

### T4 — Instructor student score roster
- [x] **T4** — `app/teach/[courseId]/scores/page.tsx` + CSV export API route

### T5 — Student score breakdown panel
- [x] **T5** — `app/courses/[slug]/_components/score-breakdown.tsx` + wire into course overview

---

# Task List — plan_admin_course_panel

## Status: COMPLETE

---

# Task List — plan_completion_review_notifications

## Status: COMPLETE

### T1 — Text answers in review page
- [x] **T1** — Added answers query + "คำตอบนักเรียน" card in `app/review/[id]/page.tsx`

### T2 — Text answers in student submission detail
- [x] **T2** — Added answers query + "คำตอบของฉัน" card in `app/submissions/[id]/page.tsx`

### T3 — Certificate trigger on lesson complete
- [x] **T3** — `markLessonComplete` in `app/courses/actions.ts` now calls `maybeIssueCertificate` fire-and-forget

### T4 — Course completion CTA on course overview
- [x] **T4** — `requestCertificate` action added; course overview shows "ขอรับเกียรติบัตร" / download link

### T5 — Notification bell in nav
- [x] **T5** — `NotificationBell` client component added to sidebar (desktop) and mobile header

---

# Task List — plan_01_ui_improve_student_course_overview

## Status: COMPLETE

### T1 — Replace inline AssignmentPanel with compact card + dedicated page
- [x] **T1a** — New page `app/courses/[slug]/assignments/[assignmentId]/page.tsx`
- [x] **T1b** — New component `app/courses/[slug]/_components/course-assignment-card.tsx`
- [x] **T1c** — Update course overview: remove AssignmentPanel, use CourseAssignmentCard

### T2 — Lesson quiz badges in LessonRow
- [x] **T2** — Extend lessons select with lessonQuizzes, batch fetch attempts, render QuizStateBadge per lesson

### T3 — LessonRow metadata
- [x] **T3** — Add estimatedMinutes + _count.assignments to lesson select + render in LessonRow

---

# Task List — quiz_lesson_section_linking

## Status: COMPLETE

### Phase 1 — Seed + Action
- [x] **T1** — Seed LessonQuiz data (link quizzes to lesson1 + lesson2)
- [x] **T2** — New `linkQuizTarget` action in `app/teach/[courseId]/quizzes/actions.ts`

### Phase 2 — Quiz Editor UI
- [x] **T3** — Teach quiz editor: replace per-row list with dropdown (`/teach/[courseId]/quizzes/[quizId]`)
- [x] **T4** — Admin quiz editor: same dropdown (`/admin/courses/[id]/quizzes/[quizId]`)

### Phase 3 — Teach Workbench
- [x] **T5** — Teach workbench: per-lesson quiz type badges (`/teach/[courseId]`)

### Phase 1 — Unified View + Section Management
- [x] **P1-T1** — Unified course tree view (sections → lessons → quiz/assignment counts)
- [x] **P1-T2** — Section CRUD in admin panel (create, rename, delete)

### Phase 2 — Assignment Full CRUD in Admin
- [x] **P2-T3** — Assignment edit page (course-level + lesson-level) with questions + attachments
- [x] **P2-T4** — Lesson editor: section selector + assignment panel + quiz count

### Phase 3 — Quiz Full CRUD + Linking
- [x] **P3-T5** — Quiz create page in admin (/admin/courses/[id]/quizzes/new)
- [x] **P3-T6** — Quiz edit page in admin — self-contained, no teach bounce
- [x] **P3-T7** — Lesson ↔ Quiz linking (covered by P3-T6 quiz editor + P2-T4 lesson editor)

### Phase 4 — Section ↔ Quiz Linking
- [x] **P4-T8** — Section ↔ Quiz linking with BEFORE/AFTER placement + gate toggle

---

# Task List — plan_password_reset

## Status: PENDING

- [ ] **T1** — Schema: `PasswordResetToken` model + migration
- [ ] **T2** — `lib/password-reset.ts`: `createResetToken` + `validateToken` + `consumeToken` + email template + unit tests
- [ ] **T3** — `app/(auth)/forgot-password/page.tsx` + `actions.ts`
- [ ] **T4** — `app/(auth)/reset-password/[token]/page.tsx` + `actions.ts`
- [ ] **T5** — Add "ลืมรหัสผ่าน?" link to `/login`

---

# Task List — plan_user_profile

## Status: PENDING

- [ ] **T1** — `app/settings/page.tsx` + `updateProfile` server action (fullName)
- [ ] **T2** — `changePassword` server action + unit tests + settings page card
- [ ] **T3** — Sidebar link to `/settings`

---

# Task List — plan_timed_quiz

## Status: PENDING

- [ ] **T1** — Schema: `Quiz.timeLimitSec Int @default(0)` + migration
- [ ] **T2** — Add `timeLimitSec` input to teach + admin quiz editors
- [ ] **T3** — `QuizTimer` client component with countdown + auto-submit + unit tests
- [ ] **T4** — Server-side enforcement in `submitQuiz` action (grace period)
- [ ] **T5** — Show time limit badge on quiz cards (student + instructor views)

---

# Task List — plan_lesson_discussion

## Status: PENDING

- [ ] **T1** — Schema: `LessonDiscussion` + `DiscussionReply` models + `DISCUSSION_QUESTION` notification type + migration
- [ ] **T2** — Server actions: `postQuestion` / `postReply` / `deleteDiscussion` / `markResolved` + unit tests
- [ ] **T3** — `DiscussionPanel` server component (question list + reply list + forms)
- [ ] **T4** — Wire `DiscussionPanel` into lesson page
- [ ] **T5** — Notify course instructor on new question

---

# Task List — plan_announcements

## Status: PENDING

- [ ] **T1** — Schema: `CourseAnnouncement` model + `COURSE_ANNOUNCEMENT` notification type + migration
- [ ] **T2** — Server actions: `createAnnouncement` / `publishAnnouncement` / `deleteAnnouncement`
- [ ] **T3** — `app/teach/[courseId]/announcements/page.tsx` (instructor management UI)
- [ ] **T4** — `CourseAnnouncementFeed` component wired into course overview
- [ ] **T5** — Batch-notify enrolled students on publish

---

# Task List — plan_bulk_enrollment

## Status: PENDING

- [ ] **T1** — `lib/enrollment-import.ts`: `parseImportCsv` + `generateTempPassword` + unit tests
- [ ] **T2** — `importEnrollmentsCsv` server action (upsert users + enrollments)
- [ ] **T3** — `ImportEnrollmentForm` client component with result summary table
- [ ] **T4** — Wire import form into instructor + admin enrollment pages
