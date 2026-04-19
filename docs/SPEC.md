# System Specification — LMS

## Purpose

A closed-enrollment Learning Management System for Thai-language vocational / professional education. Institutions import students, instructors author courses, students learn through lessons + quizzes + assignments, mentors provide 1-on-1 coaching, and admins manage the full lifecycle.

---

## Roles

| Role | Primary capability |
|------|--------------------|
| STUDENT | Enroll, learn, submit work, take quizzes, receive certificate |
| MENTOR | View assigned mentees, grade submissions, score observation videos |
| INSTRUCTOR | Author courses, manage enrollments, grade submissions, view score roster |
| ADMIN | Full system access; user management, evaluation rounds, pairings |

---

## Feature Inventory

### BUILT — Core Learning

| Feature | Location | Status |
|---------|----------|--------|
| Course catalog with search/filter (keyword, category, level) | `/courses` | ✅ Complete |
| Course detail page with lesson list | `/courses/[slug]` | ✅ Complete |
| Lesson viewer (Markdown content + YouTube embed + attachments) | `/courses/[slug]/lessons/[lessonId]` | ✅ Complete |
| Lesson progress tracking (mark complete) | `courses/actions.ts` | ✅ Complete |
| Pre-test gate (must pass quiz before lessons unlock) | Course detail page | ✅ Complete |
| Section gate (SectionQuiz with isGate must pass before next section) | Lesson page | ✅ Complete |
| Course-level pre/post test quizzes | Course detail page | ✅ Complete |
| Student progress bar | Course detail page | ✅ Complete |
| Student score breakdown panel | Course detail page | ✅ Complete |

### BUILT — Quizzes

| Feature | Status |
|---------|--------|
| Multiple-choice quiz builder (admin + instructor) | ✅ Complete |
| Quiz types: PRE_TEST, POST_TEST, QUIZ | ✅ Complete |
| Quiz placement: lesson, section (BEFORE/AFTER), course pre/post | ✅ Complete |
| Attempt tracking with best-score selection | ✅ Complete |
| Passing score threshold + isPassed flag | ✅ Complete |
| Per-lesson quiz type badges in workbench | ✅ Complete |
| Quiz attempt history for student | ✅ Complete |

### BUILT — Assignments & Submissions

| Feature | Status |
|---------|--------|
| Lesson-level and course-level assignments | ✅ Complete |
| Structured questions (TEXT / FILE / BOTH) | ✅ Complete |
| File upload with type + size validation | ✅ Complete |
| Submission state machine (DRAFT→SUBMITTED→UNDER_REVIEW→APPROVED/REJECTED/REVISION_REQUESTED) | ✅ Complete |
| Assignment attachment visibility (anytime / after submit / after approved / internal) | ✅ Complete |
| Recall submission (SUBMITTED→DRAFT before due date) | ✅ Complete |
| Review page for instructor/mentor | `/review/[id]` | ✅ Complete |
| Review comments (public + internal) | ✅ Complete |
| Score + feedback on submission | ✅ Complete |

### BUILT — Enrollment & Certificates

| Feature | Status |
|---------|--------|
| Enrollment request flow (PENDING→APPROVED/REJECTED) | ✅ Complete |
| Enrollment management page for instructors | `/teach/[courseId]/enrollments` | ✅ Complete |
| Certificate issuance (triggered on lesson completion or request) | ✅ Complete |
| Certificate download | `/api/certificate/generate` | ✅ Complete |

### BUILT — Scoring

| Feature | Status |
|---------|--------|
| CourseScoreConfig — 4 weighted components | ✅ Complete |
| Weighted final score with null-redistribution | ✅ Complete |
| Instructor score roster | `/teach/[courseId]/scores` | ✅ Complete |
| CSV score export | `/api/export/course-scores` | ✅ Complete |
| Score breakdown panel for student | `/courses/[slug]` | ✅ Complete |

### BUILT — Instructor Workbench

| Feature | Status |
|---------|--------|
| Course CRUD + cover image | `/teach/[courseId]` | ✅ Complete |
| Section CRUD + reorder | ✅ Complete |
| Lesson CRUD + reorder + section assignment | ✅ Complete |
| Assignment CRUD + questions + attachments | ✅ Complete |
| Quiz CRUD + questions + placement | ✅ Complete |
| Score weight configuration | `/teach/[courseId]/score-config` | ✅ Complete |

### BUILT — Admin Panel

| Feature | Status |
|---------|--------|
| User CRUD + role management | `/admin/users` | ✅ Complete |
| Course CRUD (full mirror of instructor workbench) | `/admin/courses` | ✅ Complete |
| Enrollment management | `/admin/enrollments` | ✅ Complete |
| Mentor-mentee pairing | `/admin/pairings` | ✅ Complete |
| Evaluation round management | `/admin/evaluations` | ✅ Complete |
| CSV exports (users, submissions, quiz attempts, completions, evaluations) | `/api/export/*` | ✅ Complete |

### BUILT — Evaluation & Observation

| Feature | Status |
|---------|--------|
| Peer evaluation rounds with rubric JSON | `/evaluations` | ✅ Complete |
| Self-evaluation per round | ✅ Complete |
| Observation video upload + YouTube link | `/observe` | ✅ Complete |
| Video scoring by mentor/instructor | `/observe/[id]` | ✅ Complete |
| Evaluation leaderboard | `/reports/leaderboard` | ✅ Complete |
| Progress report (per-student summary) | `/reports/progress` | ✅ Complete |

### BUILT — Communication & Notifications

| Feature | Status |
|---------|--------|
| In-app notification bell + dropdown | Sidebar / mobile header | ✅ Complete |
| Notification types: submission, review, certificate, enrollment | ✅ Complete |
| Email queue (OutboundEmail model + SMTP flush endpoint) | `/api/email/flush` | ✅ Complete |
| Transactional emails: enrollment, submission, review | ✅ Complete |

### BUILT — Dashboards

| Feature | Status |
|---------|--------|
| Student dashboard (enrolled courses + progress + certs) | `/dashboard` | ✅ Complete |
| Instructor dashboard | ✅ Complete |
| Mentor dashboard (mentees + pending submissions) | ✅ Complete |
| Admin dashboard | ✅ Complete |

---

## Planned New Features

The following features are absent from the current codebase and have been identified as high-value additions. Each has its own plan file in `tasks/`.

### P1 — Password Reset
**Plan:** `tasks/plan_password_reset.md`

Users cannot change their password or recover a forgotten one. SMTP is already configured. The schema needs a `PasswordResetToken` table. Feature: `/forgot-password` + `/reset-password/[token]` pages + email template.

**Impact:** High — basic security/usability gap. Blocks any real-world deployment.

---

### P2 — User Profile Settings
**Plan:** `tasks/plan_user_profile.md`

No `/settings` page. Users cannot update their display name or change their password from within the app. Pairs naturally with password reset.

**Impact:** Medium — expected by all users.

---

### P3 — Timed Quiz
**Plan:** `tasks/plan_timed_quiz.md`

Quizzes have no time limit. High-stakes exams need a countdown that auto-submits when the timer expires. Requires: `timeLimitSec` field on `Quiz`, `startedAt` already on `QuizAttempt`, countdown client component, auto-submit server action call.

**Impact:** High for institutions running formal assessments.

---

### P4 — Lesson Q&A (Discussion)
**Plan:** `tasks/plan_lesson_discussion.md`

Students have no in-platform way to ask questions. Requires: `LessonDiscussion` (question) + `DiscussionReply` models, per-lesson Q&A panel visible to enrolled students and course staff, instructor notifications on new questions.

**Impact:** High — drives engagement and reduces off-platform messaging.

---

### P5 — Course Announcements
**Plan:** `tasks/plan_announcements.md`

Instructors cannot broadcast messages to enrolled students. Requires: `CourseAnnouncement` model, post/edit/delete for instructors, announcement feed on course overview page, notification sent to all enrolled students on publish.

**Impact:** Medium — reduces reliance on external messaging tools.

---

### P6 — Bulk Enrollment Import
**Plan:** `tasks/plan_bulk_enrollment.md`

Enrolling 50+ students one-by-one is manual and error-prone. Requires: CSV upload (`email, group_name`) → find or create users → create APPROVED enrollments → summary report. Admin + instructor access.

**Impact:** High for institutional use with large cohorts.

---

## Data Model Summary

See `docs/data-model-relationships.md` for the full entity-relationship documentation.

Key models and their roles:

| Model | Purpose |
|-------|---------|
| User | All actors; role enum; mentor relation |
| Course | Learning container; pre/post quiz FKs; score config |
| CourseSection | Optional lesson grouping |
| Lesson | Content unit; markdown + youtube + attachments |
| Quiz / QuizQuestion / QuizChoice | Auto-graded MCQ |
| LessonQuiz / SectionQuiz | Quiz placement join tables |
| Assignment / AssignmentQuestion | Manual-graded work |
| Submission / SubmissionAnswer / SubmissionFile | Student work |
| Enrollment | Student ↔ Course with approval status |
| Certificate | Issued on course completion |
| CourseScoreConfig | 4-component weighted score settings |
| Notification | In-app alerts |
| OutboundEmail | Transactional email queue |
| EvaluationRound / Evaluation / SelfEvaluation | Peer assessment |
| ObservationVideo / ObservationScore | Teaching observation workflow |

---

## Tech Constraints

- Next.js 15 App Router, server components by default
- Prisma 6 + PostgreSQL — all data access via `@/lib/prisma` singleton
- NextAuth.js v4 (credentials only) — do not migrate to v5
- MinIO / S3 for files — keys served via `/api/files/[...key]`
- Thai UI copy throughout — all user-facing strings in Thai
- Server actions for all mutations; API routes only for file/CSV downloads
- Vitest for unit tests — pure logic only, no DB in tests
