# Submission Plan — Course-Level Assignment (Admin Create / Student Submit)

## Context

`Assignment` now supports both **lesson-level** (existing) and **course-level** assignments. Course-level assignments have `lessonId = null` and `courseId = <id>`. They appear on the course overview page and follow the same `Submission` state machine.

---

## Schema Change — DONE ✅

`lessonId` is nullable on `Assignment`; `courseId` FK added; `Course.assignments` relation wired.

```prisma
model Assignment {
  lessonId  Int?  @map("lesson_id")   // was required, now optional
  courseId  Int?  @map("course_id")   // set when lessonId is null
  lesson    Lesson?  @relation(...)
  course    Course?  @relation("CourseAssignments", ...)
}
```

Migration: `20260418111121_course_assignment`

---

## Dependency Graph

```
DB Migration: lessonId nullable + courseId on Assignment  ✅
  │
  ├── Admin create flow
  │     ├── /admin/courses/[id]/assignments           (list page) ✅
  │     ├── /admin/courses/[id]/assignments/new       (create form) ✅
  │     └── /admin/courses/[id]/assignments/actions.ts ✅
  │
  ├── Student view + submit flow
  │     ├── /courses/[slug]/page.tsx                  (course overview — show assignments) ✅
  │     └── AssignmentPanel (reused, lessonId now number|null) ✅
  │           └── submit/actions.ts (updated revalidatePath logic) ✅
  │
  ├── Null-guard fixes (lesson may be null)
  │     ├── submissions/page.tsx ✅
  │     ├── submissions/[id]/page.tsx ✅
  │     ├── submissions/actions.ts ✅
  │     ├── review/actions.ts ✅
  │     ├── review/[id]/page.tsx ✅
  │     ├── mentees/[studentId]/page.tsx ✅
  │     ├── lib/permissions.ts ✅
  │     ├── lib/attachment-visibility.ts ✅
  │     └── teach/[courseId]/assignments/... ✅
  │
  └── Seed mockup data
        └── prisma/seed.ts  ← NEXT (T6)
```

---

## Vertical Slices

### Phase 1 — Schema migration — DONE ✅
**Checkpoint:** `lessonId` nullable; `courseId` column added; existing data unaffected.

### Phase 2 — Admin: create & list course assignments — DONE ✅
**Checkpoint:** Admin visits course detail → sees "จัดการงาน" link → creates/lists/deletes.

- **T2** `app/admin/courses/[id]/assignments/actions.ts` ✅
- **T3** `app/admin/courses/[id]/assignments/page.tsx` ✅
- **T4** `app/admin/courses/[id]/assignments/new/page.tsx` ✅

### Phase 3 — Student: view & submit course assignments — DONE ✅
**Checkpoint:** Enrolled student sees "งานระดับวิชา" section on course overview; submits via AssignmentPanel.

- **T5** `app/courses/[slug]/page.tsx` — added query + AssignmentPanel render ✅
- All downstream `lesson?` null guards applied ✅

### Phase 4 — Seed mockup data — DONE ✅
**Checkpoint:** `npm run db:seed` creates 2 course-level assignments and DRAFT submissions for student1–2.

- **T6** `prisma/seed.ts` ✅
  - 2 course-level assignments: "Final Reflection" (4Q) + "Feedback Survey" (3Q)
  - DRAFT submissions for student1 (2 answers) and student2 (1 answer)
  - Idempotent: skips if already exists
  - Tests: `tests/unit/course-assignment-seed.test.ts` (9 tests, all GREEN)

---

## Checkpoints

| After | Gate |
|-------|------|
| T1 | Migration applied; existing data intact ✅ |
| T2 | Admin can create/delete course assignments via server actions ✅ |
| T3 | List page renders; shows correct submission counts ✅ |
| T4 | Create form works end-to-end ✅ |
| T5 | Student can start, fill, upload, and submit a course assignment ✅ |
| T6 | Seed creates demo course assignments + DRAFT submissions ✅ |

---

## Assumptions

1. `lessonId` is nullable — all downstream code guards with `?.` — done ✅
2. `recallSubmission` works for any submission regardless of lesson/course — done ✅
3. `AssignmentPanel` reused unchanged except `lessonId: number | null` — done ✅
4. Admin manages course assignments; instructor manages lesson assignments (existing)
5. No separate "course assignments" section in the student sidebar — shown on course overview ✅
