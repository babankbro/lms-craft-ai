# Plan: quiz_lesson_section_linking

## Goal
Simplify quiz linking UI in teach + admin editors to a single dropdown (one-to-one UX: quiz → lesson OR section). Add seed data so lesson-linked quizzes actually appear in the student lesson view. Surface quiz type badges in the teach workbench.

## Status: IN PROGRESS

---

## Context

### What already works
- Student lesson page (`/courses/[slug]/lessons/[lessonId]/page.tsx`) already queries `lessonQuizzes` via raw SQL and renders `QuizBanner` with PRE_TEST before content and POST_TEST after. **No changes needed here.**
- Admin quiz editor (`/admin/courses/[id]/quizzes/[quizId]/page.tsx`) has a per-row lesson toggle list (attach/detach buttons per lesson).
- Teach quiz editor (`/teach/[courseId]/quizzes/[quizId]/page.tsx`) has the same per-row lesson toggle list (lessons only, no section link).
- SectionQuiz linking (BEFORE/AFTER + gate) works in the admin course panel.

### What is missing
1. Teach + admin quiz editors show a button-per-row list — no section linking in teach editor, UX is noisy.
2. No `LessonQuiz` seed records → quizzes never appear in the student lesson view despite the UI being ready.
3. Teach workbench (`/teach/[courseId]`) doesn't show per-lesson quiz type info.

---

## Architecture decisions

### One-to-one UI (no schema change)
The schema allows many-to-many for both `LessonQuiz` and `SectionQuiz`. We keep that. The simplified UI presents a single `<select>` dropdown with:
- "ไม่เชื่อม" (no link)
- Optgroup "บทเรียน" → one option per lesson
- Optgroup "หมวด" → one option per section

When user selects a new target the action **detaches all existing links first**, then attaches the selected one. This gives one-to-one UX on top of the many-to-many schema without a migration.

### Server action
New file: `app/teach/[courseId]/quizzes/actions.ts`
Export: `linkQuizTarget(quizId: number, courseId: number, formData: FormData)`

Logic:
1. Parse `targetType` ("lesson" | "section" | "none") and `targetId`
2. Detach all existing `LessonQuiz` for this quiz in this course (via lesson ids)
3. Detach all existing `SectionQuiz` for this quiz
4. If `targetType !== "none"`: attach to lesson OR section
5. `revalidatePath` for teach + admin paths

Reuses existing `attachQuizToLesson` / `detachQuizFromLesson` from `app/teach/actions.ts`
and `attachSectionQuiz` / `detachSectionQuiz` from `app/teach/[courseId]/sections/actions.ts`.

---

## Tasks

### T1 — Seed LessonQuiz data
**File:** `prisma/seed.ts`

Inside the `if (!existingCourse)` block, after lessons are created, add:
- `lesson1` (บทที่ 1) → link `sec1PreQuiz` via `LessonQuiz` (order 0)
- `lesson2` (บทที่ 2) → link `sec1PostQuiz` via `LessonQuiz` (order 0)

`sec1PreQuiz` has type `QUIZ` (not PRE_TEST), so also create a new small PRE_TEST quiz and link it to lesson1 for a proper pre-lesson banner. OR — simpler: update `sec1PreQuiz` to type `PRE_TEST` so it renders as a before-lesson quiz in the student view.

Simplest approach: create two new tiny quizzes (3 questions each) of type `PRE_TEST` and `POST_TEST`, link them to lesson1 and lesson2 respectively.

Add idempotent backfill block in the `else` branch too.

**Acceptance criteria:**
- `npx prisma db seed` runs without error on fresh DB
- After seed, visiting lesson1 shows a PRE_TEST quiz banner before content
- After seed, visiting lesson2 shows a POST_TEST quiz banner after content
- Re-running seed doesn't duplicate records

### T2 — New action: linkQuizTarget
**File:** `app/teach/[courseId]/quizzes/actions.ts` (new file)

```ts
export async function linkQuizTarget(
  quizId: number,
  courseId: number,
  formData: FormData,
): Promise<void>
```

- Requires role INSTRUCTOR | ADMIN
- Reads `targetType: "lesson" | "section" | "none"` and `targetId: number` from formData
- Detaches all LessonQuiz for this quizId where lesson.courseId === courseId
- Detaches all SectionQuiz for this quizId where section.courseId === courseId
- Attaches if targetType !== "none"
- revalidatePath `/teach/${courseId}` and `/admin/courses/${courseId}`

**Test file:** `tests/unit/quiz-link-target.test.ts`
Test the detach-first-then-attach logic with mocked state.

**Acceptance criteria:**
- Action detaches old links before creating new one
- Selecting "none" leaves no links
- revalidatePath called for both paths

### T3 — Teach quiz editor: simplify to dropdown
**File:** `app/teach/[courseId]/quizzes/[quizId]/page.tsx`

Changes:
1. Add `sectionQuizzes` to the quiz query include
2. Add sections query: `prisma.courseSection.findMany({ where: { courseId }, select: { id, title } })`
3. Compute `currentTarget`: check lessonQuizzes[0] or sectionQuizzes[0] → derive `targetType` and `targetId`
4. Replace the "เชื่อมกับบทเรียน" Card with a new "เชื่อมกับบทเรียน / หมวด" Card containing:
   - Current status line: "เชื่อมกับ: [lesson/section name]" or "ยังไม่เชื่อม"
   - `<form>` with `<select name="target">` (optgroup lessons + sections) + hidden `quizId` + Save button
   - Action: `linkQuizTarget.bind(null, qId, cId)`

**Acceptance criteria:**
- Dropdown shows current linked lesson/section as selected value on load
- Saving a lesson selection → quiz appears in student lesson view
- Saving a section selection → quiz appears in section gate
- Saving "ไม่เชื่อม" → all links cleared
- No more per-row button list

### T4 — Admin quiz editor: simplify to dropdown
**File:** `app/admin/courses/[id]/quizzes/[quizId]/page.tsx`

Same dropdown replacement as T3. Import `linkQuizTarget` from the teach quizzes actions.

**Acceptance criteria:**
- Admin quiz editor renders same dropdown UX
- Actions from admin path revalidate both admin + teach

### T5 — Teach workbench: per-lesson quiz type badges
**File:** `app/teach/[courseId]/page.tsx`

Add to lessons query within sections and unsectioned:
```ts
lessonQuizzes: { include: { quiz: { select: { type: true } } } }
```

In the lesson row render, add a small badge showing quiz count/type:
- PRE_TEST count → blue badge "Pre: N"
- POST_TEST/QUIZ count → grey badge "Quiz: N"
- Show nothing if lessonQuizzes.length === 0

**Acceptance criteria:**
- Lesson rows show quiz badges after T1 seed runs
- Zero-quiz lessons show no badge

---

## Dependency order
T1 → T2 → T3 → T4 → T5

T1 first so there's real data to verify T3 works in the browser.
T2 before T3/T4 since both pages import the new action.
