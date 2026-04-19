# Plan: 01_ui_improve_student_course_overview

## Status: PENDING

## Target page
`/courses/[slug]` — the student-facing course overview page.

---

## Audit — current state vs. desired state

### Issue 1 — Course assignments render full interactive form inline
**Current:** `AssignmentPanel` (a 500-line client component with file upload, text editors, submit logic) is rendered for each course-level assignment directly in the course overview page. This makes the page extremely heavy and confusing — students are confronted with full assignment forms while browsing the course structure.

**Desired:** Each course-level assignment shows a compact summary card with status badge and a single CTA button that links to a dedicated assignment page where the full interaction lives.

### Issue 2 — Lesson-linked quizzes invisible on course overview
**Current:** `LessonRow` shows title + completion badge only. A student cannot see from the course overview that lesson 2 has a PRE_TEST before it or a POST_TEST after it. They only discover this when navigating into the lesson, and have no way to track quiz progress from the course map.

**Desired:** Each `LessonRow` shows quiz type badges (ก่อนเรียน / หลังเรียน) with attempt status (ยังไม่ทำ / ผ่าน / ทำซ้ำ), linking to `/courses/[slug]/quiz/[quizId]`. These are drawn from the existing `LessonQuiz` join table.

### Issue 3 — LessonRow lacks useful metadata
**Current:** LessonRow only shows `order`, `title`, and a "เรียนจบ" badge. No duration, no assignment count, no quiz indicator.

**Desired:** Show `estimatedMinutes` if set, and `assignments` count (as "1 งาน" badge) so a student can gauge effort per lesson before clicking in.

---

## Dependency graph

```
T1 — Dedicated course assignment page + compact card on overview
  ├── NEW: app/courses/[slug]/assignments/[assignmentId]/page.tsx
  │     (server component — loads assignment + submission, renders AssignmentPanel)
  ├── NEW: app/courses/[slug]/_components/course-assignment-card.tsx
  │     (server component — compact summary: title, dueDate, status badge, CTA link)
  └── MODIFY: app/courses/[slug]/page.tsx
        — replace AssignmentPanel render loop with CourseAssignmentCard
        — simplify query: no longer need to include full questions or submission files inline

T2 — Lesson quiz badges in LessonRow
  ├── MODIFY: app/courses/[slug]/page.tsx
  │     — add lessonQuizzes to lessons select in both sections.lessons and top-level lessons
  │     — batch fetch quiz attempt status for all collected lesson quiz IDs
  │     — pass quizInfo array + attemptMap to LessonRow
  └── MODIFY: LessonRow component (inline in page.tsx)
        — accept quizInfo prop and render QuizStateBadge per linked quiz

T3 — Lesson metadata in LessonRow (estimated time + assignment count)
  └── MODIFY: app/courses/[slug]/page.tsx
        — add estimatedMinutes and _count.assignments to lessons select
        — pass to LessonRow
        — LessonRow renders "~Nนาที" and "N งาน" chips
```

T1 is independent of T2 and T3. T2 and T3 both touch the same files but are non-conflicting.

---

## Task details

---

### T1 — Replace inline AssignmentPanel with compact card + dedicated page

#### 1a — New dedicated page: `/courses/[slug]/assignments/[assignmentId]`

**File:** `app/courses/[slug]/assignments/[assignmentId]/page.tsx`

This is a new server component that:
1. Requires auth (`requireAuth()`).
2. Fetches the assignment (verifying it belongs to this course and `lessonId` is null).
3. Verifies user is enrolled (APPROVED) or is staff.
4. Fetches the student's existing submission (with `answers: { include: { files } }` and `files`).
5. Renders the page header with breadcrumb: "คอร์ส / ชื่อวิชา → งานระดับวิชา → [assignment title]".
6. Renders `AssignmentPanel` (the existing component, unchanged) with the loaded data.

```ts
// Route: /courses/intro-to-teaching/assignments/12
// Breadcrumb: คอร์สเรียน > ความรู้เบื้องต้นเกี่ยวกับการสอน > งานระดับวิชา > Final Reflection
```

**Query:**
```ts
const assignment = await prisma.assignment.findUnique({
  where: { id: assignmentId },
  include: {
    questions: { orderBy: { order: "asc" } },
    course: { select: { slug: true, title: true } },
  },
});
// Guard: assignment.courseId === course.id && assignment.lessonId === null
```

**Acceptance criteria:**
- Route resolves without error for enrolled student
- Full AssignmentPanel renders (upload works, text saves, submit works)
- Unenrolled student is redirected to course page
- Breadcrumb shows course title → "งานระดับวิชา" → assignment title

---

#### 1b — New compact card: `CourseAssignmentCard`

**File:** `app/courses/[slug]/_components/course-assignment-card.tsx`

Server component (no "use client"). Props:
```ts
interface Props {
  assignment: { id: number; title: string; dueDate: Date | null; description: string };
  submission: { status: string } | null;
  courseSlug: string;
}
```

Renders:
```
┌─────────────────────────────────────────────────┐
│ 📋  Final Reflection                  [ยังไม่ส่ง] │
│     ส่งภายใน 15 มิ.ย. 2569                        │
│     สรุปการเรียนรู้ตลอดหลักสูตร...               │
│                                    [ดูงาน / ส่งงาน] │
└─────────────────────────────────────────────────┘
```

Status badge mapping:
- `null` submission → "ยังไม่ส่ง" (outline)
- DRAFT → "ร่าง" (secondary)
- SUBMITTED → "ส่งแล้ว" (secondary)
- UNDER_REVIEW → "กำลังตรวจ" (default)
- REVISION_REQUESTED → "แก้ไข" (destructive)
- APPROVED → "ผ่านแล้ว ✓" (default/green)
- REJECTED → "ไม่ผ่าน" (destructive)

CTA button label:
- No submission: "เริ่มงาน"
- DRAFT: "ต่องาน"
- SUBMITTED / UNDER_REVIEW: "ดูงาน"
- REVISION_REQUESTED: "แก้ไข"
- APPROVED / REJECTED: "ดูงาน"

CTA links to `/courses/[slug]/assignments/[id]`

---

#### 1c — Update course overview to use compact card

**File:** `app/courses/[slug]/page.tsx`

Changes:
1. Simplify the `courseAssignmentsWithSubs` query — no longer need `include: { questions: ... }` or deep `answers.files`. Only need `submission.status`.
2. Replace the `AssignmentPanel` render with `CourseAssignmentCard`.
3. Keep the "งานระดับวิชา" section heading and empty state.

Simplified query:
```ts
const subs = await prisma.submission.findMany({
  where: { assignmentId: { in: assignments.map(a => a.id) }, studentId: user.id },
  select: { assignmentId: true, status: true },
});
```

**Acceptance criteria:**
- Course overview page no longer renders file upload widgets
- Each assignment shows as a compact card with status + link
- Clicking the CTA opens the full assignment page with upload/submit intact
- Staff (INSTRUCTOR/ADMIN/MENTOR) see the cards and can navigate to the assignment page
- Empty-state message shown when no course assignments exist

---

### T2 — Lesson quiz badges in course overview LessonRow

#### 2a — Extend lesson query to include linked quizzes

**File:** `app/courses/[slug]/page.tsx`

Change the `sections.lessons` select (and top-level `lessons`) from:
```ts
select: { id: true, title: true, order: true, sectionId: true }
```
to:
```ts
select: {
  id: true, title: true, order: true, sectionId: true,
  lessonQuizzes: {
    select: {
      quizId: true,
      quiz: { select: { id: true, type: true, passingScore: true } },
    },
  },
}
```

#### 2b — Batch fetch lesson quiz attempt status

After collecting all lessons, gather all `lessonQuizIds` and batch-fetch the best attempt per quiz for the current user (only when `isApproved`):

```ts
const allLessonQuizIds = allLessons.flatMap(l =>
  (l.lessonQuizzes ?? []).map(lq => lq.quiz.id)
);

const lessonQuizAttemptMap = new Map<number, { isPassed: boolean | null; isSubmitted: boolean }>();
if (isApproved && allLessonQuizIds.length > 0) {
  const attempts = await prisma.quizAttempt.findMany({
    where: { studentId: user.id, quizId: { in: allLessonQuizIds }, isSubmitted: true },
    orderBy: { attemptNo: "desc" },
    distinct: ["quizId"],
    select: { quizId: true, isPassed: true, isSubmitted: true },
  });
  for (const a of attempts) {
    lessonQuizAttemptMap.set(a.quizId, { isPassed: a.isPassed, isSubmitted: a.isSubmitted });
  }
}
```

Add `lessonQuizAttemptMap` to `lessonQuizAttemptMap` variable. Pass it into each `LessonRow`.

#### 2c — Update LessonRow to render quiz badges

Add to `LessonRow` props:
```ts
quizzes?: Array<{ id: number; type: string }>;
quizAttemptMap?: Map<number, { isPassed: boolean | null; isSubmitted: boolean }>;
courseSlug: string; // already present
```

Render each quiz as a compact inline badge below the title:
- PRE_TEST → blue / "ก่อนเรียน"
- POST_TEST → teal / "หลังเรียน"
- QUIZ → grey / "แบบทดสอบ"

Each badge links to `/courses/[slug]/quiz/[quizId]`.

Use the existing `QuizStateBadge` component (already in the project), passing:
- `placement`: derive from type ("BEFORE" for PRE_TEST, "AFTER" for POST_TEST/QUIZ)
- `attempt`: from the map (undefined if not attempted)
- `href`: `/courses/[slug]/quiz/[quizId]`

Only show quiz badges for enrolled students (`canViewAsEnrolled`).

**Acceptance criteria:**
- Lesson 1 (linked to PRE_TEST quiz) shows blue "ก่อนเรียน" badge in course overview
- Lesson 2 (linked to POST_TEST quiz) shows teal "หลังเรียน" badge
- After attempting a quiz, badge updates to show pass/fail state (page refresh)
- Locked lessons still show lock icon; quiz badges are not shown for locked lessons
- Zero-quiz lessons show no badge (no empty space)
- Staff see badges and can navigate to quizzes

---

### T3 — LessonRow metadata (estimated time + assignment count)

#### 3a — Extend lesson select to include metadata

Add to the `sections.lessons` and top-level `lessons` selects:
```ts
estimatedMinutes: true,
_count: { select: { assignments: true } },
```

#### 3b — Update LessonRow component

Add to `LessonRow` props:
```ts
estimatedMinutes?: number | null;
assignmentCount?: number;
```

Render (only when non-zero / non-null):
- `"~${estimatedMinutes} นาที"` → small Clock icon + text, muted style
- `"${assignmentCount} งาน"` → small FileText icon + text, muted style

Place these chips on the right side of the lesson row, to the left of the "เรียนจบ" badge.

**Acceptance criteria:**
- Lessons with `estimatedMinutes` set show time estimate
- Lessons with 1+ assignments show "N งาน"
- Lessons with no extras show no extra chrome
- LessonRow still fits a single row for most screen widths (chips wrap gracefully)

---

## Complete design mockup — new LessonRow

```
┌──────────────────────────────────────────────────────────────────┐
│ ✓ 1. บทที่ 1: แนะนำหลักสูตร         ~25นาที  1งาน  [เรียนจบ] │
│   [ก่อนเรียน: ตรวจสอบความรู้เดิม ✓]                            │
└──────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│   2. บทที่ 2: จิตวิทยาการศึกษา       ~30นาที  1งาน             │
│   [หลังเรียน: ทดสอบความเข้าใจ (ยังไม่ทำ)]                       │
└──────────────────────────────────────────────────────────────────┘
```

**Section header with section quiz badges (existing — keep as-is):**
```
─ หมวดที่ 1: พื้นฐานการสอน ──── [ตรวจสอบความพร้อม ก่อน] [แบบทดสอบหลังเรียน ผ่าน ✓]
```

---

## Complete design mockup — course assignment compact card

```
งานระดับวิชา

┌─────────────────────────────────────────────────────────────────┐
│ 📋 งานสรุปการเรียนรู้ระดับวิชา (Final Reflection) [ร่าง]       │
│    ส่งภายใน 2 มิ.ย. 2569 · สรุปและสะท้อนความคิดเกี่ยวกับ...   │
│                                              [ต่องาน →]         │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ 📋 แบบสอบถามความพึงพอใจ                          [ยังไม่ส่ง]   │
│    ส่งภายใน 17 ก.ค. 2569 · ให้ข้อเสนอแนะเพื่อพัฒนาหลักสูตร... │
│                                              [เริ่มงาน →]       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration checklist

| System | Integration point | Impact |
|--------|------------------|--------|
| `AssignmentPanel` | Moved to dedicated page — no code changes to the component itself | None |
| `submit/actions.ts` | `revalidatePath` already targets `/courses/[slug]` — works from new route | None |
| `QuizStateBadge` | Reused in LessonRow — component unchanged | None |
| `lib/course-gates.ts` | Lesson access gate still enforced — linked quizzes shown but locked lessons still locked | None |
| `lesson quiz` route | `/courses/[slug]/quiz/[quizId]` — exists, works for both course-level and lesson-level quizzes | None |

---

## Checkpoints

| After | Gate |
|-------|------|
| T1a | `/courses/[slug]/assignments/[id]` renders AssignmentPanel; upload + submit work |
| T1b | `CourseAssignmentCard` renders status correctly for all 6 states |
| T1c | Course overview page loads faster (no AssignmentPanel in initial HTML); assignment cards show |
| T2 | Course overview shows quiz badges per lesson; click navigates to quiz page |
| T3 | Lessons show time + assignment count where set in seed data |

---

## Dependency order

T1a → T1b → T1c (sequential: page first, component second, wire into overview last)
T2 (independent of T1, can parallelize)
T3 (independent, can parallelize with T2)

Recommended build order: T1a, T1b, T1c, T2, T3
