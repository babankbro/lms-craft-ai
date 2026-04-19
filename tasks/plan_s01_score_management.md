# Plan: s01_score_management

## Status: PENDING

## Overview

Implement a weighted course score system. Each course can be configured with four weight categories. The final student score is a weighted average of:

1. **Lesson post-tests** — best attempt `%` across all `LessonQuiz` records where `quiz.type === "POST_TEST"` (and `"QUIZ"`)
2. **Section post-tests** — best attempt `%` across all `SectionQuiz` records where `placement === "AFTER"`
3. **Lesson assignments** — APPROVED submission score across all `Assignment` where `lessonId != null`
4. **Course assignments** — APPROVED submission score across all `Assignment` where `lessonId == null AND courseId == course.id`

Scores within each category are averaged equally. If a category has no items (e.g., no section quizzes), its score contribution is 0 regardless of the configured weight.

---

## Schema analysis

### Existing models used
| Model | Key fields |
|-------|------------|
| `QuizAttempt` | `percentage: Float?`, `isPassed: Boolean?`, `isSubmitted: Boolean` |
| `LessonQuiz` | `lessonId`, `quizId` + `quiz.type` |
| `SectionQuiz` | `sectionId`, `quizId`, `placement: BEFORE\|AFTER` |
| `Submission` | `score: Float?`, `maxScore: Float?`, `status: SubmissionStatus` |
| `Assignment` | `lessonId: Int?`, `courseId: Int?` |

### New model required
`CourseScoreConfig` — one row per course storing the four weight percentages.

`Assignment.maxScore` — standardized max score for normalization (optional; falls back to `Submission.maxScore`).

---

## Dependency graph

```
T1 — Schema: CourseScoreConfig + Assignment.maxScore
  └── prisma migration

T2 — Scoring library: lib/course-score.ts
  ├── Depends on T1 (reads CourseScoreConfig)
  └── Pure function: getStudentCourseScore(userId, courseId) → ScoreBreakdown

T3 — Instructor score-weight config page
  ├── app/teach/[courseId]/score-config/page.tsx  (server component)
  ├── app/teach/[courseId]/score-config/actions.ts (saveScoreConfig)
  └── Depends on T1 + T2 (reads/writes CourseScoreConfig, previews formula)

T4 — Instructor student score roster
  ├── app/teach/[courseId]/scores/page.tsx
  └── Depends on T2 (calls getStudentCourseScore for each enrolled student)

T5 — Student score breakdown panel on course overview
  ├── app/courses/[slug]/_components/score-breakdown.tsx (server component)
  ├── Modify app/courses/[slug]/page.tsx to render it
  └── Depends on T2

T3, T4, T5 are independent of each other — only all depend on T1+T2.
```

**Build order:** T1 → T2 → T3, T4, T5 (T3–T5 in any order)

---

## Task details

---

### T1 — Schema: `CourseScoreConfig` + `Assignment.maxScore`

#### 1a — Add `CourseScoreConfig` model to `prisma/schema.prisma`

```prisma
model CourseScoreConfig {
  id                      Int     @id @default(autoincrement())
  courseId                Int     @unique @map("course_id")
  lessonQuizWeight        Float   @default(25) @map("lesson_quiz_weight")
  sectionQuizWeight       Float   @default(25) @map("section_quiz_weight")
  lessonAssignmentWeight  Float   @default(25) @map("lesson_assignment_weight")
  courseAssignmentWeight  Float   @default(25) @map("course_assignment_weight")
  updatedAt               DateTime @updatedAt @map("updated_at")

  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@map("course_score_configs")
}
```

Add back-relation on `Course`: `scoreConfig CourseScoreConfig?`

#### 1b — Add `maxScore: Float?` to `Assignment`

```prisma
model Assignment {
  // existing fields ...
  maxScore Float? @map("max_score")   // ← ADD THIS
}
```

#### 1c — Migrate

```bash
npx prisma migrate dev --name add_course_score_config
```

**Acceptance criteria:**
- `prisma migrate dev` runs without error
- `prisma studio` shows `course_score_configs` table and `assignments.max_score` column
- Existing data unaffected (migration is purely additive)

---

### T2 — Scoring library: `lib/course-score.ts`

New pure-async function with no side effects.

#### Return type

```ts
export type ComponentScore = {
  score: number | null;   // null = no items in this category
  itemCount: number;      // how many items contributed
  weight: number;         // configured weight (0–100)
};

export type ScoreBreakdown = {
  lessonQuiz: ComponentScore;
  sectionQuiz: ComponentScore;
  lessonAssignment: ComponentScore;
  courseAssignment: ComponentScore;
  finalScore: number | null;           // null if all weights = 0 or no config
  weightsConfigured: boolean;           // true if CourseScoreConfig row exists
};
```

#### Algorithm

```ts
export async function getStudentCourseScore(
  userId: string,
  courseId: number
): Promise<ScoreBreakdown>
```

**Step 1 — Load config** (upsert default 25/25/25/25 on first read):
```ts
const config = await prisma.courseScoreConfig.upsert({
  where: { courseId },
  update: {},
  create: { courseId },
});
```

**Step 2 — Lesson post-tests** (quiz.type in POST_TEST, QUIZ):
```ts
const lessonQuizzes = await prisma.lessonQuiz.findMany({
  where: { lesson: { courseId }, quiz: { type: { in: ["POST_TEST", "QUIZ"] } } },
  select: { quizId: true },
});
// For each quizId, fetch best attempt by max percentage
```

**Step 3 — Section post-tests** (placement === AFTER):
```ts
const sectionQuizzes = await prisma.sectionQuiz.findMany({
  where: { section: { courseId }, placement: "AFTER" },
  select: { quizId: true },
});
```

**Step 4 — Lesson assignments** (assignment.lessonId != null):
```ts
const lessonAssignments = await prisma.assignment.findMany({
  where: { lessonId: { not: null }, lesson: { courseId } },
  select: { id: true, maxScore: true },
});
// For each: find student's APPROVED submission, compute normalized score
// normalizedScore = sub.score / (assignment.maxScore ?? sub.maxScore ?? 100) * 100
```

**Step 5 — Course assignments** (assignment.lessonId == null, courseId match):
```ts
const courseAssignments = await prisma.assignment.findMany({
  where: { courseId, lessonId: null },
  select: { id: true, maxScore: true },
});
```

**Step 6 — Final weighted score**:
```
finalScore = sum(component.score * component.weight / 100)
           / sum(component.weight for components where score != null)
           * 100
```

Only components that have items AND have score != null contribute to the denominator.

**Acceptance criteria:**
- `getStudentCourseScore` returns correct breakdown for a student with known data (unit tested)
- Returns `null` component scores for categories with no items
- `finalScore` is null if no configured weights (all 0)
- Handles student with no attempts/submissions (returns 0 for components with items)

**Unit tests:** `tests/unit/course-score-calculator.test.ts`
- Correct weighted average when all 4 components present
- Component with no items returns `score: null` and is excluded from final denominator
- All-null components → `finalScore: null`
- Score normalization: `sub.score/assignment.maxScore*100` vs fallback

---

### T3 — Instructor score-weight config page

**File:** `app/teach/[courseId]/score-config/page.tsx`
**Action:** `app/teach/[courseId]/score-config/actions.ts`

#### UI design

```
┌──────────────────────────────────────────────────────┐
│  กำหนดน้ำหนักคะแนน                                   │
│                                                      │
│  แบบทดสอบหลังเรียน (บทเรียน)     [  25 ] %           │
│  แบบทดสอบหลังเรียน (หมวด)        [  25 ] %           │
│  งานมอบหมาย (บทเรียน)            [  25 ] %           │
│  งานมอบหมาย (ระดับวิชา)          [  25 ] %           │
│                                  ────────            │
│  รวม                              [ 100 ] %  ✓       │
│                                                      │
│  [  บันทึก  ]   [  รีเซ็ตเป็น 25% ทุกหมวด  ]        │
│                                                      │
│  ── ตัวอย่างการคำนวณ ──────────────────────────────  │
│  แบบทดสอบหลังเรียน (บทเรียน): 80% × 25% = 20.0 คะแนน│
│  ...                                                 │
│  คะแนนรวม: 73.5 / 100                                │
└──────────────────────────────────────────────────────┘
```

**Validation rules:**
- Each weight: 0–100 (integers or 1-decimal floats)
- Sum must equal exactly 100 before saving
- Client-side live sum display with green/red indicator
- Submit button disabled when sum ≠ 100

**Live sum** implemented as a `"use client"` component `WeightForm` within the page.

#### Server action

```ts
export async function saveScoreConfig(courseId: number, formData: FormData): Promise<void> {
  await requireRole("INSTRUCTOR", "ADMIN");
  const lessonQuizWeight     = parseFloat(formData.get("lessonQuizWeight") as string);
  const sectionQuizWeight    = parseFloat(formData.get("sectionQuizWeight") as string);
  const lessonAssignmentWeight = parseFloat(formData.get("lessonAssignmentWeight") as string);
  const courseAssignmentWeight = parseFloat(formData.get("courseAssignmentWeight") as string);
  const total = lessonQuizWeight + sectionQuizWeight + lessonAssignmentWeight + courseAssignmentWeight;
  if (Math.abs(total - 100) > 0.01) throw new Error("Weights must sum to 100");

  await prisma.courseScoreConfig.upsert({
    where: { courseId },
    update: { lessonQuizWeight, sectionQuizWeight, lessonAssignmentWeight, courseAssignmentWeight },
    create: { courseId, lessonQuizWeight, sectionQuizWeight, lessonAssignmentWeight, courseAssignmentWeight },
  });
  revalidatePath(`/teach/${courseId}`);
}
```

#### Navigation

Add link in `app/teach/[courseId]/page.tsx` course workbench:

```tsx
<Link href={`/teach/${courseId}/score-config`}>
  <Button variant="outline" size="sm">กำหนดน้ำหนักคะแนน</Button>
</Link>
```

Also add "Assignment Max Score" field to the assignment edit pages (`/teach/[courseId]/assignments/[id]`).

**Acceptance criteria:**
- Page loads showing current config (defaults to 25/25/25/25)
- Live sum updates as user types — shows green ✓ or red warning
- Save button disabled when sum ≠ 100
- Saving stores values and redirects back with success toast
- Reset button restores 25/25/25/25

---

### T4 — Instructor student score roster

**File:** `app/teach/[courseId]/scores/page.tsx`

#### UI design

```
คะแนนนักเรียน — ชื่อหลักสูตร
น้ำหนักที่ตั้งไว้: ทดสอบบทเรียน 30% | ทดสอบหมวด 20% | งานบทเรียน 30% | งานวิชา 20%

┌──────────────────────────────────────────────────────────────────────────────┐
│ ชื่อ-นามสกุล   │ ทดสอบบทเรียน │ ทดสอบหมวด │ งานบทเรียน │ งานวิชา │ รวม   │
├──────────────────────────────────────────────────────────────────────────────┤
│ สมชาย ใจดี     │   72.5 (3/3)  │  80 (1/1)  │ 65 (2/3)   │ 90 (1/1)│ 74.2  │
│ มาลี สุขใจ     │   55 (2/3)    │   — (0/1)  │  — (0/3)   │ 75 (1/1)│ 47.5  │
│ ประชา ดีงาม    │   — (0/3)     │   — (0/1)  │  — (0/3)   │  — (0/1)│  —    │
└──────────────────────────────────────────────────────────────────────────────┘
[ดาวน์โหลด CSV]
```

Column format: `score (completed/total)` where "completed" means has submitted/attempted.

`—` = no items attempted.

**Color coding:**
- Final score ≥ 70: green
- Final score 50–69: amber
- Final score < 50: red
- `—` (no data): muted

#### CSV export

Add API route: `app/api/export/course-scores/route.ts`

```
student_id, full_name, email, group,
lesson_quiz_score, section_quiz_score, lesson_assignment_score, course_assignment_score,
final_score
```

**Acceptance criteria:**
- Shows all APPROVED-enrolled students
- Components show `—` for no items (not 0)
- Sorting by final score descending by default
- CSV export downloads correctly
- Shows configured weight percentages above table

---

### T5 — Student score breakdown panel on course overview

**File:** `app/courses/[slug]/_components/score-breakdown.tsx`

#### UI design

Shown only for APPROVED students on `/courses/[slug]`. Placed below progress bar, above pre-test gate banner.

```
┌─────────────────────────────────────────────────────┐
│ คะแนนความก้าวหน้า                                    │
│                                                      │
│ แบบทดสอบหลังเรียน (บทเรียน)  ████████░░░  72.5%     │
│   (30%) → 21.8 คะแนน                                │
│                                                      │
│ แบบทดสอบหลังเรียน (หมวด)     ████████████  80.0%    │
│   (20%) → 16.0 คะแนน                                │
│                                                      │
│ งานมอบหมาย (บทเรียน)          ██████░░░░░  65.0%    │
│   (30%) → 19.5 คะแนน                                │
│                                                      │
│ งานมอบหมาย (ระดับวิชา)        ████████████  90.0%   │
│   (20%) → 18.0 คะแนน                                │
│                                                      │
│ ─────────────────────────────────────────────       │
│ คะแนนรวม                                  75.3 / 100│
└─────────────────────────────────────────────────────┘
```

If weights are all 0 (no config) → show only completion progress (existing bar), no score breakdown.

If a category has no items → show "ยังไม่มีรายการ" in muted text.

**Props:**
```ts
interface Props {
  userId: string;
  courseId: number;
}
```

Calls `getStudentCourseScore(userId, courseId)` server-side.

**Acceptance criteria:**
- Breakdown renders correctly for student with mix of completed/uncompleted
- Shows `—` label for categories with no items (not a bar)
- Shows `(not counted)` next to 0-weight categories so student understands
- Final score absent if no config exists (graceful degradation)
- Not shown for staff view (isStaff = true) — staff see roster instead

---

### T3 extension — Assignment `maxScore` field in teach assignment editor

**File:** `app/teach/[courseId]/assignments/[id]/page.tsx`

Add `maxScore` number input to the assignment edit form:
```
คะแนนเต็ม (สำหรับคำนวณคะแนน)  [ 100 ]
```

Server action `updateAssignment` extended to save `maxScore`.

This ensures the scoring lib can normalize assignment scores consistently.

**Acceptance criteria:**
- Instructor can set `maxScore` on any assignment
- Field defaults to blank (optional)
- Value is used in `getStudentCourseScore` normalization

---

## Complete design mockup — score config page

```
/teach/[courseId]/score-config

กำหนดน้ำหนักคะแนน — ชื่อหลักสูตร
← กลับไปหน้าจัดการวิชา

┌─── การตั้งค่าน้ำหนัก ──────────────────────────────────────────┐
│  หมวดหมู่                              น้ำหนัก                 │
│  ──────────────────────────────────────────────────            │
│  แบบทดสอบหลังเรียน (ระดับบทเรียน)     [ 30 ] %                │
│  แบบทดสอบหลังเรียน (ระดับหมวด)        [ 20 ] %                │
│  งานมอบหมาย (ระดับบทเรียน)            [ 30 ] %                │
│  งานมอบหมาย (ระดับวิชา)               [ 20 ] %                │
│  ──────────────────────────────────────────────────            │
│  รวม                                  [ 100 ] % ✓             │
│                                                                │
│  [บันทึกการตั้งค่า]  [รีเซ็ตเป็น 25/25/25/25]                │
└────────────────────────────────────────────────────────────────┘

┌─── ตัวอย่างการคำนวณ (ใช้ข้อมูลนักเรียนตัวอย่าง) ────────────┐
│  Component             Score    Weight   Contribution          │
│  Lesson post-tests     72.5%  ×  30%  =  21.75 pts            │
│  Section post-tests    80.0%  ×  20%  =  16.00 pts            │
│  Lesson assignments    65.0%  ×  30%  =  19.50 pts            │
│  Course assignments    90.0%  ×  20%  =  18.00 pts            │
│  ───────────────────────────────────────────────              │
│  คะแนนรวม                              75.25 / 100            │
└────────────────────────────────────────────────────────────────┘
```

---

## Integration checklist

| System | Integration | Impact |
|--------|-------------|--------|
| `lib/scoring.ts` | No change — `getStudentCourseScore` adds a new layer above it | None |
| `maybeIssueCertificate` | No change — certificate still uses binary completion gates | None |
| `approveSubmission` | No change — existing score field on Submission is what we read | None |
| Review page | Optional: show normalized score contribution hint to reviewer | Additive only |
| Export CSV | Extend `/api/export/` with new course-scores route | New file |
| Workbench page | Add "กำหนดน้ำหนักคะแนน" + "คะแนนนักเรียน" buttons | 2 links added |

---

## Checkpoints

| After | Gate |
|-------|------|
| T1 | Migration runs; `course_score_configs` table visible in DB |
| T2 | Unit tests pass for score calculator; `getStudentCourseScore` returns correct breakdown |
| T3 | Instructor can set weights; page validates sum = 100; saves to DB |
| T3 ext | Assignment `maxScore` field saves from teach editor |
| T4 | Roster shows all enrolled students with per-component + final scores; CSV downloads |
| T5 | Score breakdown visible on course overview for enrolled student; absent for staff |

---

## Dependency order

```
T1 (schema) → T2 (lib) → T3 (config UI + assignment maxScore)
                       → T4 (roster)
                       → T5 (student panel)
```

Recommended build order: **T1 → T2 → T3 → T4 → T5**
