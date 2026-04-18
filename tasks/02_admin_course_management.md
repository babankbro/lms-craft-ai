# Plan: 02 — Admin/Instructor Course Management Improvements

## Context

`/teach/[courseId]` is the instructor workbench for course authoring. Three gaps were found:

1. **Lesson form cannot assign หมวด (section)** — `new/page.tsx` has no section dropdown; the edit page has no section field either. Lessons are always created sectionless and can only be moved into sections via the drag-and-drop sortable list (no keyboard/form path).

2. **Lesson editor cannot see or navigate to its assignments** — The lesson detail editor at `/teach/[courseId]/lessons/[lessonId]` shows linked quizzes but shows NO assignments for that lesson. The only way to find a lesson's assignment is to navigate to `/teach/[courseId]/assignments` and scan the full list.

3. **Course-level assignments missing from teach path** — `/teach/[courseId]/assignments/page.tsx` only iterates `course.lessons` and their assignments. Assignments with `lessonId=null, courseId=<id>` (created via admin path) are invisible to instructors. The workbench count also excludes them. There is no instructor-facing path to create or manage course-level assignments.

---

## Audit: What Already Works

| Feature | Status |
|---|---|
| Admin creates course-level assignments at `/admin/courses/[id]/assignments` | ✅ |
| Students see course assignments on `/courses/[slug]` overview | ✅ |
| Students can submit via `AssignmentPanel` (lessonId=null) | ✅ |
| Lesson edit form has title/content/youtube/estimatedMinutes | ✅ |
| Assignment edit has title/desc/dueDate/questions/attachments | ✅ |
| Section CRUD (create/rename/delete/reorder) | ✅ |
| Move lesson to section via SectionListSortable | ✅ |
| **Lesson create/edit form has section selector** | ❌ |
| **Lesson editor links to its assignments** | ❌ |
| **Teach assignments page shows course-level assignments** | ❌ |
| **Instructor can create course-level assignments** | ❌ (admin-only now) |

---

## Dependency Graph

```
T1 — Section field in lesson create form
  └── teaches/actions.ts: createLesson accepts sectionId
      teach/[courseId]/lessons/new/page.tsx: add section dropdown

T2 — Section field in lesson edit form
  └── teach/actions.ts: updateLesson accepts sectionId
      teach/[courseId]/lessons/[lessonId]/page.tsx: add section selector

T3 — Lesson editor shows linked assignments
  └── teach/[courseId]/lessons/[lessonId]/page.tsx: add Assignments card
      (no new server actions needed — read-only + links to existing edit page)

T4 — Teach assignments page shows course-level assignments
  └── teach/[courseId]/assignments/page.tsx: add course-level section
      teach/[courseId]/page.tsx: fix assignmentCount to include courseId assignments

T5 — Instructor can create course-level assignments in teach path
  └── teach/[courseId]/assignments/actions.ts: add createCourseAssignmentInTeach
      teach/[courseId]/assignments/new/page.tsx: add "course-level" toggle option
```

---

## Vertical Slices

### Phase 1 — Lesson ↔ Section wiring (T1, T2)

**T1 — Section selector in lesson create form**

Files:
- `app/teach/actions.ts` — `createLesson`: parse `sectionId` from formData
- `app/teach/[courseId]/lessons/new/page.tsx` — load `course.sections`, render `<select name="sectionId">`

AC:
- Dropdown lists all sections for the course + "ไม่มีหมวด" option
- Submitting with a section creates lesson with that `sectionId`
- Submitting with "ไม่มีหมวด" creates lesson with `sectionId: null`
- Existing behaviour (order, title, content) unaffected

Verify: Create lesson via form → check DB `sectionId` is set correctly

---

**T2 — Section selector in lesson edit form**

Files:
- `app/teach/actions.ts` — `updateLesson`: parse `sectionId` from formData
- `app/teach/[courseId]/lessons/[lessonId]/page.tsx` — load `course.sections`, add `<select>` defaulting to current `lesson.sectionId`

AC:
- Edit page shows current section (pre-selected)
- Changing section and saving updates `sectionId` in DB
- Setting to "ไม่มีหมวด" clears `sectionId`

Verify: Change lesson section via form → workbench shows lesson in correct section

---

### Phase 2 — Lesson editor shows its assignments (T3)

**T3 — Assignments card on lesson editor**

File:
- `app/teach/[courseId]/lessons/[lessonId]/page.tsx`
  - Add query: `assignment.findMany({ where: { lessonId: lId }, include: { _count: { select: { submissions: true } } } })`
  - Render card "งานมอบหมาย" listing each assignment with submission count + Edit link + Delete button
  - "เพิ่มงาน" button → `/teach/${courseId}/assignments/new?lessonId=${lId}`

AC:
- Lesson editor shows all assignments for that lesson
- Edit link navigates to existing assignment edit page
- Empty state shown when no assignments
- Assignment with submissions disables delete

Verify: `/teach/1/lessons/1` shows the seeded "แผนการจัดการเรียนรู้" assignment

---

### Phase 3 — Course-level assignments in teach path (T4, T5)

**T4 — Teach assignments page includes course-level assignments**

Files:
- `app/teach/[courseId]/assignments/page.tsx`
  - Add query: `assignment.findMany({ where: { courseId, lessonId: null }, ... })`
  - Render new card "งานระดับวิชา" above or below lesson assignments
  - Link each to its edit page at `/teach/${courseId}/assignments/${a.id}`
- `app/teach/[courseId]/page.tsx`
  - Fix `assignmentCount` query to: `prisma.assignment.count({ where: { OR: [{ lesson: { courseId: id } }, { courseId: id, lessonId: null }] } })`

AC:
- `/teach/1/assignments` shows 2 course-level assignments from seed in a distinct section
- Workbench shows correct total count (5 lesson + 2 course = 7)
- Edit links open the existing assignment edit page

Verify: Navigate to teach → assignments → see all 7 assignments across two sections

---

**T5 — Instructor can create course-level assignments from teach path**

Files:
- `app/teach/[courseId]/assignments/actions.ts` — add `createCourseAssignmentFromTeach(courseId, formData)` (mirrors admin action but uses `requireCourseAuthor`)
- `app/teach/[courseId]/assignments/new/page.tsx`
  - Add radio/select: "บทเรียนที่เฉพาะ" vs "ระดับวิชา (ทุกบทเรียน)"
  - When "ระดับวิชา" selected: hide lesson dropdown, call `createCourseAssignmentFromTeach`
  - When "บทเรียนที่เฉพาะ" selected: existing `createAssignment` path

AC:
- Selecting "ระดับวิชา" creates assignment with `lessonId=null, courseId=<id>`
- Result appears in "งานระดับวิชา" section on assignments list
- INSTRUCTOR and ADMIN can both create (not just ADMIN)

Verify: Instructor creates course assignment → appears in student course overview

---

## Checkpoints

| After | Gate |
|---|---|
| T1 | Lesson can be created with a section via form |
| T2 | Lesson section can be changed in edit form |
| T3 | Lesson editor card shows assignments for that lesson |
| T4 | Teach assignments page shows both lesson + course assignments; count fixed |
| T5 | Instructor can create course-level assignments from `/teach` path |

---

## Assumptions

1. `sectionId` field in create/edit form replaces the drag-only section assignment — the sortable component still works as a visual reorder tool
2. T3 is read-only display + navigation links — no new server actions
3. T5 uses `requireCourseAuthor` (INSTRUCTOR or ADMIN) not `requireRole("ADMIN")` — so instructors can create course-level assignments for their own courses
4. No changes to student-facing pages (already done in submission_plan)
5. Assignment edit page (`/teach/[courseId]/assignments/[id]`) already works for both lesson and course assignments — no changes needed there
