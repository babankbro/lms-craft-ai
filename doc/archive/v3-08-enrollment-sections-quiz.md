# Mini LMS v3 — Doc 8: Enrollment Approval · Course Sections · Quiz Gates

> **Phase:** 4 (next sprint)
> **Parents:** [01 Architecture](./mini-lms-v3-01-overview-architecture.md) · [03 Content & Learning](./mini-lms-v3-03-content-learning.md) · [07 Implementation Plan](./mini-lms-v3-07-implementation-plan.md)
> **Status:** Design — not yet implemented.
> **Scope:** Three tightly-related features: (A) student-initiated enrollment requests with admin/instructor approval, (B) course section grouping for lessons, (C) course-level PRE_TEST gate + section-level quizzes + POST_TEST completion gate.

---

## §0 Current State vs. Target

| Area | Today | After this phase |
|---|---|---|
| Enrollment | Instant — `INSERT enrollments(userId, courseId)` with no status column | Request-approve flow; `status: PENDING → APPROVED | REJECTED` |
| Course structure | Flat lessons (`courseId + order`) | Sections group lessons; lessons get optional `sectionId` |
| PRE_TEST position | Quiz row with `type = PRE_TEST` exists, but nothing enforces it must be passed before lesson 1 | Gate enforced: PRE_TEST must be submitted before any lesson is unlocked |
| Section quiz | No section-level quiz join table | `SectionQuiz` join table; section unlocks after section quiz passed (configurable) |
| POST_TEST position | `type = POST_TEST` exists, but `maybeIssueCertificate()` only checks `isPassed` | POST_TEST required after all sections; certificate gated behind it |

---

## §A Enrollment Approval Workflow

### A.1 User story

1. Student visits course catalog → clicks **ขอลงทะเบียน** (Request enrollment).
2. System creates `Enrollment { status: PENDING }`, notifies INSTRUCTOR/ADMIN.
3. Admin or course INSTRUCTOR sees pending requests in `/admin/enrollments` or `/teach/[courseId]/enrollments`.
4. Approves → STUDENT can access lessons. Rejects with optional reason → STUDENT notified.
5. STUDENT can cancel their own `PENDING` request (not an `APPROVED` one — that requires admin).
6. Only one pending or approved enrollment allowed per `(userId, courseId)` pair.

### A.2 Schema changes

```prisma
// --- Enum (add to schema.prisma) ---
enum EnrollmentStatus {
  PENDING     // student submitted request; awaiting decision
  APPROVED    // reviewer approved; student can access course
  REJECTED    // reviewer rejected; student cannot access course
  CANCELLED   // student cancelled their own pending request
}

// --- Replace existing Enrollment model ---
model Enrollment {
  id           Int              @id @default(autoincrement())
  userId       String           @map("user_id")
  courseId     Int              @map("course_id")
  status       EnrollmentStatus @default(PENDING)
  requestedAt  DateTime         @default(now()) @map("requested_at")
  reviewedAt   DateTime?        @map("reviewed_at")
  reviewedById String?          @map("reviewed_by_id")
  rejectReason String?          @db.Text @map("reject_reason")

  user       User    @relation("EnrollmentUser",     fields: [userId],       references: [id], onDelete: Cascade)
  course     Course  @relation(fields: [courseId],   references: [id],       onDelete: Cascade)
  reviewedBy User?   @relation("EnrollmentReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)

  @@unique([userId, courseId])
  @@index([courseId, status])
  @@map("enrollments")
}
```

Migration SQL:
```sql
-- Add EnrollmentStatus enum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED');

-- Migrate existing rows (current enrollment = already approved)
ALTER TABLE "enrollments"
  ADD COLUMN "status"         "EnrollmentStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "requested_at"   TIMESTAMP NOT NULL DEFAULT "enrolled_at",
  ADD COLUMN "reviewed_at"    TIMESTAMP,
  ADD COLUMN "reviewed_by_id" TEXT REFERENCES "users"(id) ON DELETE SET NULL,
  ADD COLUMN "reject_reason"  TEXT;

-- Remove the old timestamp column name alias (rename was cosmetic in app only)
-- enrolledAt remains as requested_at; drop if no legacy client reads it
-- ALTER TABLE "enrollments" DROP COLUMN "enrolled_at"; -- defer until tested
```

### A.3 State machine

```
         ┌──────────────────────────────────────────────┐
         │                                              │
  [Student] ──request──→  PENDING ──approve──→  APPROVED ──[access lessons]
                              │
                              ├──reject──→  REJECTED  (reviewer sets rejectReason)
                              │
                              └──cancel──→  CANCELLED (student action)

  APPROVED ──revoke──→  REJECTED (admin only; rare; kicks student from course)
```

Transitions allowed per actor:

| Transition | From | To | Actor |
|---|---|---|---|
| request | — | PENDING | STUDENT |
| approve | PENDING | APPROVED | INSTRUCTOR (own course) / ADMIN |
| reject | PENDING | REJECTED | INSTRUCTOR (own course) / ADMIN |
| cancel | PENDING | CANCELLED | STUDENT (own request) |
| revoke | APPROVED | REJECTED | ADMIN only |
| re-request | REJECTED / CANCELLED | PENDING | STUDENT (creates new row or reactivates) |

> **Guard:** `@@unique([userId, courseId])` means only one row per pair. A re-request after REJECTED must `UPDATE … SET status='PENDING', reviewedAt=NULL, rejectReason=NULL` on the existing row, not INSERT a new one.

### A.4 Access guard

All protected lesson/quiz routes must check `enrollment.status = 'APPROVED'` (not just row existence).

Change in `app/api/files/[...key]/route.ts` and lesson viewer:

```ts
// was: !!enrollment
// now:
const enrollment = await db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
if (!enrollment || enrollment.status !== 'APPROVED') return NextResponse.json({ error: 'Not enrolled' }, { status: 403 });
```

### A.5 Notification events

Add two values to `NotificationType` enum:

```prisma
enum NotificationType {
  // existing...
  ENROLLMENT_REQUESTED   // → notify INSTRUCTOR + ADMIN
  ENROLLMENT_APPROVED    // → notify STUDENT
  ENROLLMENT_REJECTED    // → notify STUDENT (include rejectReason)
}
```

### A.6 Routes

| Route | Role | Purpose |
|---|---|---|
| `POST /courses/[slug]/enroll` (server action) | STUDENT | Submit enrollment request |
| `DELETE /courses/[slug]/enroll` (server action) | STUDENT | Cancel PENDING request |
| `/teach/[courseId]/enrollments` | INSTRUCTOR | List PENDING requests for own course; approve/reject |
| `/admin/enrollments` | ADMIN | All pending requests across all courses; bulk approve |

Course landing page (`/courses/[slug]`) shows:

- No enrollment: **ขอลงทะเบียน** button.
- `PENDING`: "รออนุมัติ" (awaiting approval) chip — disabled button.
- `APPROVED`: **เข้าเรียน** (Enter course) button.
- `REJECTED`: "ถูกปฏิเสธ" badge + reject reason + re-request button.

---

## §B Course Sections

### B.1 Why sections

Courses with 15–30 lessons benefit from grouping. A section is a named chapter with its own ordering, optional description, and an optional section-level quiz gate. Lessons belong to one section (or remain "ungrouped" if migrated from a flat course).

### B.2 Schema changes

```prisma
model CourseSection {
  id          Int      @id @default(autoincrement())
  courseId    Int      @map("course_id")
  title       String
  description String?  @db.Text
  order       Int      // section position within course
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  course       Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons      Lesson[]
  sectionQuizzes SectionQuiz[]

  @@index([courseId, order])
  @@map("course_sections")
}

// Lesson gets an optional sectionId
// Add to Lesson:
//   sectionId  Int?  @map("section_id")
//   section    CourseSection? @relation(fields: [sectionId], references: [id], onDelete: SetNull)
```

Migration SQL:
```sql
CREATE TABLE "course_sections" (
  "id"          SERIAL PRIMARY KEY,
  "course_id"   INTEGER NOT NULL REFERENCES "courses"(id) ON DELETE CASCADE,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "order"       INTEGER NOT NULL,
  "created_at"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "course_sections_course_id_order_idx" ON "course_sections"("course_id","order");

ALTER TABLE "lessons" ADD COLUMN "section_id" INTEGER REFERENCES "course_sections"(id) ON DELETE SET NULL;
```

> **Backward compat:** `sectionId` is nullable. Existing lessons without a section still work — they render as "บทเรียน" (top-level) and appear before sectioned lessons in the UI. Instructors can optionally migrate them into sections.

### B.3 Section-level progress

A section is "complete" when:
1. All lessons within it are marked complete **AND**
2. The section quiz (if one exists and is configured as required) is passed.

```ts
// lib/progress.ts
export async function isSectionComplete(userId: string, sectionId: number): Promise<boolean> {
  const section = await db.courseSection.findUnique({
    where: { id: sectionId },
    include: { lessons: true, sectionQuizzes: { include: { quiz: true } } }
  });
  const allLessonsDone = await checkAllLessonsComplete(userId, section.lessons.map(l => l.id));
  if (!allLessonsDone) return false;
  const requiredQuiz = section.sectionQuizzes.find(sq => sq.quiz.maxAttempts > 0); // treat as required if attempts limited
  if (!requiredQuiz) return true;
  return await isQuizPassed(userId, requiredQuiz.quizId);
}
```

### B.4 INSTRUCTOR authoring UI

Under `/teach/[courseId]`:

```
Sections panel (left rail)
  + Add section
  [Drag handle] Section 1 — "Introduction"   [edit] [delete]
      └── Lesson 1.1
      └── Lesson 1.2
      └── [+ Add lesson]
      └── [Section quiz: none] [Attach quiz]
  [Drag handle] Section 2 — "Core concepts"
      └── ...
  Unsectioned lessons (legacy)
      └── ...
```

Actions:
- Create section (title + description)
- Reorder sections (drag or ▲▼ buttons)
- Move lesson into / out of section
- Attach a quiz to a section (section quiz gate)

---

## §C Quiz Gates (PRE_TEST → Sections → POST_TEST)

### C.1 Intended flow

```
Course enrollment (APPROVED)
        │
        ▼
  ┌─────────────┐
  │  PRE_TEST   │  (if course has a PRE_TEST quiz)
  │  quiz gate  │  Student must submit (pass not required — diagnostic)
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  Section 1  │
  │  Lessons    │
  │  Section    │  Section quiz: must PASS to unlock Section 2
  │  Quiz       │
  └──────┬──────┘
         │  (repeat for each section)
         ▼
  ┌─────────────┐
  │  Section N  │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  POST_TEST  │  Must PASS (score ≥ passingScore)
  │  quiz gate  │
  └──────┬──────┘
         │
         ▼
  Certificate issued (if all assignments also approved — existing check in maybeIssueCertificate())
```

### C.2 Schema changes for quiz placement

```prisma
// Add SectionQuiz join table (for section-level quizzes)
model SectionQuiz {
  id        Int  @id @default(autoincrement())
  sectionId Int  @map("section_id")
  quizId    Int  @map("quiz_id")
  order     Int  @default(0)
  isGate    Boolean @default(true) @map("is_gate") // if true, section N+1 is locked until passed

  section CourseSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  quiz    Quiz          @relation(fields: [quizId],    references: [id], onDelete: Cascade)

  @@unique([sectionId, quizId])
  @@map("section_quizzes")
}

// Add to Quiz model:
// sectionQuizzes SectionQuiz[]  (back-relation)

// Course-level quiz placement already exists via Quiz.courseId + QuizType enum.
// Add: Quiz.isCourseGate Boolean @default(false) @map("is_course_gate")
// → PRE_TEST with isCourseGate=true blocks lesson 1 until submitted.
// → POST_TEST with isCourseGate=true blocks certificate until passed.
```

Migration SQL:
```sql
CREATE TABLE "section_quizzes" (
  "id"          SERIAL PRIMARY KEY,
  "section_id"  INTEGER NOT NULL REFERENCES "course_sections"(id) ON DELETE CASCADE,
  "quiz_id"     INTEGER NOT NULL REFERENCES "quizzes"(id)         ON DELETE CASCADE,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "is_gate"     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE("section_id","quiz_id")
);

ALTER TABLE "quizzes" ADD COLUMN "is_course_gate" BOOLEAN NOT NULL DEFAULT false;
```

### C.3 Gate enforcement logic

```ts
// lib/course-gates.ts

export async function canAccessLesson(userId: string, lessonId: number): Promise<boolean> {
  const lesson = await db.lesson.findUnique({ where: { id: lessonId },
    include: { course: { include: { quizzes: true } }, section: { include: { sectionQuizzes: { include: { quiz: true } } } } }
  });
  const courseId = lesson.courseId;

  // 1. Must be APPROVED
  const enrollment = await db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!enrollment || enrollment.status !== 'APPROVED') return false;

  // 2. PRE_TEST gate
  const preTest = lesson.course.quizzes.find(q => q.type === 'PRE_TEST' && q.isCourseGate);
  if (preTest) {
    const attempt = await db.quizAttempt.findFirst({ where: { quizId: preTest.id, studentId: userId, isSubmitted: true } });
    if (!attempt) return false; // pre-test not even submitted
  }

  // 3. Section gate (previous section's quiz must be passed)
  if (lesson.section) {
    const prevSections = await db.courseSection.findMany({
      where: { courseId, order: { lt: lesson.section.order } },
      include: { sectionQuizzes: { where: { isGate: true }, include: { quiz: true } } }
    });
    for (const prev of prevSections) {
      for (const sq of prev.sectionQuizzes) {
        const passed = await isQuizPassed(userId, sq.quizId);
        if (!passed) return false;
      }
    }
  }

  return true;
}

export async function canAccessPostTest(userId: string, courseId: number): Promise<boolean> {
  // All sections must be complete (all lessons done + section quizzes passed)
  const sections = await db.courseSection.findMany({ where: { courseId }, orderBy: { order: 'asc' } });
  for (const section of sections) {
    if (!(await isSectionComplete(userId, section.id))) return false;
  }
  return true;
}
```

### C.4 PRE_TEST — diagnostic vs. gating

| Config | Behaviour |
|---|---|
| `isCourseGate = false` (default) | PRE_TEST is optional / diagnostic; no lock |
| `isCourseGate = true` | Student must submit PRE_TEST before lesson 1 unlocks; passing is NOT required (it's a diagnostic) |

POST_TEST always requires a passing score when `isCourseGate = true`.

### C.5 Certificate update

`lib/certificate.ts → maybeIssueCertificate()` currently checks:
1. All lessons complete
2. POST_TEST passed
3. All QUIZ passed

**Add:**
4. Enrollment status = `APPROVED` (sanity guard)
5. All section quiz gates passed

---

## §D Implementation Tasks

### Phase order

| # | Task | Priority | Effort | Depends on |
|---|---|:-:|:-:|---|
| D-1 | Schema migration: `EnrollmentStatus` + new `Enrollment` columns | P0 | S | — |
| D-2 | Update enrollment guard everywhere (`status = APPROVED`) | P0 | S | D-1 |
| D-3 | Enrollment request server action + course landing UI | P1 | M | D-1 |
| D-4 | Enrollment approval UI in `/teach/[courseId]/enrollments` + `/admin/enrollments` | P1 | M | D-3 |
| D-5 | Enrollment notifications (`ENROLLMENT_REQUESTED`, `_APPROVED`, `_REJECTED`) | P1 | S | D-3, D-4 |
| D-6 | Schema migration: `CourseSection` + `Lesson.sectionId` | P1 | S | D-1 |
| D-7 | Section CRUD in instructor course workbench | P1 | M | D-6 |
| D-8 | Student course view renders sections (accordion or list) | P1 | S | D-6 |
| D-9 | `isSectionComplete()` helper | P1 | S | D-6 |
| D-10 | Schema migration: `SectionQuiz` + `Quiz.isCourseGate` | P1 | S | D-6 |
| D-11 | `canAccessLesson()` gate logic | P1 | M | D-2, D-9, D-10 |
| D-12 | `canAccessPostTest()` gate logic | P1 | S | D-11 |
| D-13 | UI: show lock icon on gated lessons / sections | P2 | S | D-11 |
| D-14 | Update `maybeIssueCertificate()` to check section gates | P1 | S | D-12 |
| D-15 | Seed script: demo course with sections + PRE/POST + section quiz | P2 | M | D-7, D-10 |

### DoD (per task)

| Task | Acceptance |
|---|---|
| D-1 | `prisma migrate status` clean on fresh DB; existing `APPROVED` rows migrated |
| D-2 | `curl /api/files/lessons/…` with a PENDING enrollment returns 403 |
| D-3 | Student clicks request → enrollment row appears with `status=PENDING`; no lesson access yet |
| D-4 | Instructor approves → student's `/courses/[slug]` shows "เข้าเรียน" button immediately |
| D-5 | Notification row in DB for each transition; no duplicate notifications on retry |
| D-6 | `prisma migrate status` clean; existing lessons have `sectionId = null` |
| D-7 | Instructor can create 3 sections, move lesson between them, delete empty section |
| D-8 | `/courses/[slug]` renders sections as collapsible groups |
| D-9 | Unit test: section with 2 lessons + 1 gate quiz reports false until both lessons done AND quiz passed |
| D-10 | `prisma migrate status` clean; `is_course_gate=false` default for all existing quizzes |
| D-11 | Integration test: student blocked from lesson 2.1 until section 1 quiz passed |
| D-12 | Integration test: POST_TEST link hidden until all sections complete |
| D-13 | Visual QA: lock icon on locked lessons, no lock on open |
| D-14 | Integration test: certificate not issued if section quiz gate not passed |
| D-15 | `pnpm db:seed` runs cleanly; demo student sees correct gate states |

---

## §E Open Questions

1. **Auto-approve option:** Should instructors be able to set a course to "open enrollment" (instant APPROVED, skipping the request step)? Suggest adding `Course.requiresApproval Boolean @default(true)`.
2. **Section quiz gate — can instructors disable per section?** Current design: `SectionQuiz.isGate` handles this. Confirm product preference.
3. **Re-request after REJECT:** Should there be a cooldown period before a student can re-request, or immediate?
4. **PRE_TEST mandatory submission vs. mandatory pass:** Current design says submit-only for PRE_TEST gate (it's diagnostic). Confirm.
5. **Lesson ordering across sections:** When a lesson moves to a different section, does its `order` reset to section-local, or remain global? Recommend section-local with re-index.
