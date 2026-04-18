# Assignment Feature Plan

## Overview

Two features to implement:

1. **Student per-question file upload** — each question of type `FILE` or `BOTH` gets its own dedicated upload slot; a required FILE question must have ≥ 1 file before submission is allowed.
2. **Admin/Instructor assignment creation** — create and manage assignments on any lesson of any course through the teach interface.

---

## Current State (What Already Works)

| Area | Status |
|------|--------|
| `Assignment` model with `questions: AssignmentQuestion[]` | ✅ Done |
| `AssignmentQuestion` fields: `prompt`, `responseType` (TEXT/FILE/BOTH), `required`, `maxLength` | ✅ Done |
| `Submission` → `SubmissionAnswer` → `SubmissionFile` chain | ✅ Done |
| `AssignmentPanel` client component — per-question `QuestionRow` with individual upload areas | ✅ Done |
| `attachAnswerFile` server action — upserts `SubmissionAnswer` then creates linked `SubmissionFile` | ✅ Done |
| `canSubmit` validation — required FILE questions must have ≥ 1 file | ✅ Done |
| Assignment creation at `/teach/[courseId]/assignments/new` | ✅ Done |
| Admin can access teach interface (`canAuthor` includes ADMIN) | ✅ Done |
| Question builder on assignment edit page | ✅ Done |

---

## Gap Analysis

### Gap 1 — No per-question file count limit (`maxFiles`)

Currently `AssignmentQuestion` has no `maxFiles` field. A student can upload many files to a single `FILE`-type question. For requirements like "upload exactly 1 lesson plan PDF", there is no enforcement.

**Schema change needed:**
```prisma
model AssignmentQuestion {
  // ... existing fields ...
  maxFiles  Int?   @map("max_files")  // null = unlimited
}
```

**UI enforcement needed** in `QuestionRow`:
- Hide the upload button once `answer.files.length >= question.maxFiles`
- Show helper text: `อัปโหลดได้สูงสุด N ไฟล์`

**Submit validation** in `canSubmit`:
- Reject if `answer.files.length > question.maxFiles` (guard against race)

---

### Gap 2 — Admin assignment management entry point

Admin can access `/teach/[courseId]/assignments/new` but there is **no direct link** from the admin panel or course list. Admin must know the URL.

**Missing:**
- Link from `/admin` or course cards to `/teach/[courseId]/assignments`
- OR: dedicated `/admin/courses/[courseId]/assignments` that redirects to the teach interface

---

### Gap 3 — Assignment not visible on course workbench card

The course workbench page (`/teach/[courseId]`) shows a lessons card and a quizzes card but **no assignments summary card**. An instructor cannot see at a glance how many assignments exist per course.

---

## Implementation Tasks

### Task F1 — `maxFiles` field on `AssignmentQuestion`

**Files:**
- `prisma/schema.prisma` — add `maxFiles Int? @map("max_files")` to `AssignmentQuestion`
- Run `prisma db push`
- `app/teach/[courseId]/assignments/[id]/question-actions.ts` — pass `maxFiles` in `addQuestion` / `updateQuestion`
- `app/teach/[courseId]/assignments/[id]/page.tsx` — add `maxFiles` number input to question editor
- `app/courses/[slug]/lessons/[lessonId]/_components/assignment-panel.tsx` — enforce limit in `QuestionRow`
- `app/courses/[slug]/lessons/[lessonId]/page.tsx` — include `maxFiles` in the `Question` type passed to panel

**Acceptance criteria:**
- [ ] `maxFiles: 1` hides the upload button after first file is uploaded
- [ ] `maxFiles: null` allows unlimited uploads (existing behavior unchanged)
- [ ] Submit is blocked when any FILE/BOTH question exceeds `maxFiles`
- [ ] Question editor shows `maxFiles` input (number, optional, min 1)
- [ ] `prisma db push` succeeds with no data loss

**Verification:** `npx vitest run tests/unit/` all pass + `tsc --noEmit` clean

---

### Task F2 — Admin assignment entry point

**Files:**
- `app/admin/courses/page.tsx` (or equivalent admin course list) — add "จัดการงาน" link to `/teach/[courseId]/assignments`
- `app/teach/[courseId]/page.tsx` — add Assignments summary card (count, link to `/teach/[courseId]/assignments`)

**Acceptance criteria:**
- [ ] Admin course list shows "จัดการงาน" link for each course
- [ ] Course workbench (`/teach/[courseId]`) shows assignment count card
- [ ] Clicking through lands on `/teach/[courseId]/assignments` correctly
- [ ] Admin can create a new assignment, add questions, and save — end to end

**Verification:** Manual browser test as admin user

---

### Task F3 — Assignments card on course workbench

**Files:**
- `app/teach/[courseId]/page.tsx` — add prisma query for assignment count, render a new `<Card>` below Quizzes
- Prisma query: `prisma.assignment.count({ where: { lesson: { courseId } } })`

**Acceptance criteria:**
- [ ] Card shows total assignment count for the course
- [ ] "ดูทั้งหมด" button links to `/teach/[courseId]/assignments`
- [ ] "+ เพิ่มงาน" button links to `/teach/[courseId]/assignments/new`

**Verification:** `tsc --noEmit` clean, manual browser check

---

## Data Model Reference

```
Assignment
  id, lessonId, title, description
  maxFileSize (bytes), allowedTypes (String[])
  dueDate?

AssignmentQuestion
  id, assignmentId, order
  prompt, responseType (TEXT | FILE | BOTH)
  required, maxLength?, maxFiles?   ← NEW
  → answers: SubmissionAnswer[]

Submission
  id, assignmentId, studentId
  status (DRAFT | SUBMITTED | UNDER_REVIEW | REVISION_REQUESTED | APPROVED | REJECTED)
  score?, feedback?, reviewedBy?, reviewedAt?

SubmissionAnswer
  id, submissionId, questionId
  textAnswer?
  → files: SubmissionFile[]

SubmissionFile
  id, submissionId, answerId?
  fileName, fileKey, fileSize, mimeType
```

---

## Question Response Type Matrix

| responseType | Shows textarea | Shows file upload | `maxFiles` applies |
|---|---|---|---|
| `TEXT` | ✅ | ❌ | N/A |
| `FILE` | ❌ | ✅ | ✅ |
| `BOTH` | ✅ | ✅ | ✅ |

---

## Per-Question File Upload Flow (Student)

```
Student opens lesson page
  └── AssignmentPanel renders
        └── For each question (FILE / BOTH):
              QuestionRow
                ├── [Upload button] → click → file picker
                │     POST /api/upload?prefix=submissions/{subId}/q{qId}
                │     → S3 key returned
                │     attachAnswerFile(subId, qId, meta)
                │       → upsert SubmissionAnswer
                │       → create SubmissionFile (answerId set)
                │     → answer.files updated in state
                │
                ├── [File list] shows uploaded files with remove button
                │     removeSubmissionFile(fileId) → delete from DB
                │
                └── [Upload button hidden] when files.length >= maxFiles
```

---

## Admin Assignment Creation Flow

```
Admin → /admin (course list)
  └── Click "จัดการงาน" on a course
        → /teach/{courseId}/assignments
              ├── List of existing assignments
              └── "+ เพิ่มงาน" → /teach/{courseId}/assignments/new
                    ├── Select lesson (dropdown)
                    ├── Fill title, description, maxFileSize, dueDate, allowedTypes
                    └── Submit → createAssignment() server action
                          → redirect to /teach/{courseId}/assignments/{newId}
                                ├── Add questions (+ เพิ่มคำถาม)
                                │     prompt, responseType, required, maxLength, maxFiles
                                └── Upload instructor files (PROMPT/GUIDE/EXAMPLE)
```

---

## Implementation Order

1. **F1** — `maxFiles` schema + UI (independent, no dependencies)
2. **F3** — Assignment card on workbench (independent)
3. **F2** — Admin entry point (depends on F3 card being visible)

F1 and F3 can be developed in parallel.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `maxFiles` DB column breaks existing rows | Low | Column is nullable; existing rows get `null` = unlimited |
| Admin creates assignment on another instructor's course | Med | `requireCourseAuthor` already guards — admin bypasses course-author check by design |
| Student re-uploads after `maxFiles` limit (race condition) | Low | Server-side count check before creating `SubmissionFile` |
