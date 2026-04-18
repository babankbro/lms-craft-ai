# Data Model Relationships: Course · Lesson · Assignment · Quiz

## Overview

```
Course
 ├── CourseSection[]          (optional grouping of lessons)
 ├── Lesson[]                 (ordered learning units)
 │    ├── Assignment[]        (lesson-level work)
 │    └── LessonQuiz[]        (quizzes embedded in a lesson)
 ├── Assignment[]             (course-level work, lessonId = null)
 ├── Quiz[]                   (quizzes owned by this course)
 ├── preTestQuiz → Quiz       (course entry gate)
 └── postTestQuiz → Quiz      (course exit gate)
```

---

## 1. Course

**Table:** `courses`

| Key field | Type | Notes |
|---|---|---|
| `id` | Int | PK |
| `slug` | String | URL identifier, unique |
| `isPublished` | Boolean | Only published courses are visible to students |
| `requiresApproval` | Boolean | Enrollment requires admin/instructor approval |
| `preTestQuizId` | Int? | FK → Quiz (entry gate) |
| `postTestQuizId` | Int? | FK → Quiz (exit gate) |

**Relations out:**

| Relation | Cardinality | Description |
|---|---|---|
| `lessons` | 1 → many | All lessons in this course |
| `sections` | 1 → many | Optional section groupings |
| `assignments` | 1 → many | Course-level assignments (lessonId = null) |
| `quizzes` | 1 → many | All quizzes owned by this course |
| `preTestQuiz` | 1 → 0..1 | Quiz used as course pre-test |
| `postTestQuiz` | 1 → 0..1 | Quiz used as course post-test |
| `enrollments` | 1 → many | Student enrolments |
| `certificates` | 1 → many | Completion certificates issued |

---

## 2. CourseSection

**Table:** `course_sections`

Optional grouping layer between Course and Lesson.

| Key field | Type | Notes |
|---|---|---|
| `courseId` | Int | FK → Course |
| `order` | Int | Display order within the course |

**Relations:**

| Relation | Cardinality | Description |
|---|---|---|
| `course` | many → 1 | Parent course |
| `lessons` | 1 → many | Lessons grouped in this section |
| `sectionQuizzes` | 1 → many | Quizzes placed before/after this section |

---

## 3. Lesson

**Table:** `lessons`

Core learning unit inside a course.

| Key field | Type | Notes |
|---|---|---|
| `courseId` | Int | FK → Course (required) |
| `sectionId` | Int? | FK → CourseSection (optional grouping) |
| `order` | Int | Position within the course |
| `youtubeUrl` | String? | Embedded video |
| `estimatedMinutes` | Int? | Estimated reading/watch time |

**Relations out:**

| Relation | Cardinality | Description |
|---|---|---|
| `course` | many → 1 | Parent course |
| `section` | many → 0..1 | Optional section group |
| `assignments` | 1 → many | Lesson-specific assignments |
| `lessonQuizzes` | 1 → many | Quizzes linked to this lesson (via join table) |
| `progress` | 1 → many | Per-student completion records |
| `attachments` | 1 → many | Downloadable lesson files |

---

## 4. Assignment

**Table:** `assignments`

Work submitted by students. Can be scoped to a lesson OR to the whole course.

| Key field | Type | Notes |
|---|---|---|
| `lessonId` | Int? | FK → Lesson. **null** = course-level assignment |
| `courseId` | Int? | FK → Course. Set when lessonId is null |
| `maxFileSize` | Int | Bytes; default 10 MB |
| `allowedTypes` | String[] | MIME type whitelist |
| `dueDate` | DateTime? | Optional deadline |

### Two scopes

```
Lesson-level:   lessonId = <id>  courseId = null
Course-level:   lessonId = null  courseId = <id>
```

Both scopes share the same `Assignment` model and submission flow.

**Relations out:**

| Relation | Cardinality | Description |
|---|---|---|
| `lesson` | many → 0..1 | Parent lesson (null for course-level) |
| `course` | many → 0..1 | Parent course (null for lesson-level) |
| `questions` | 1 → many | Structured response prompts |
| `attachments` | 1 → many | Instructor-provided files (prompt, guide, example) |
| `submissions` | 1 → many | Student submissions |

### AssignmentQuestion

Each assignment can have structured questions with three response types:

| `responseType` | Meaning |
|---|---|
| `TEXT` | Text answer only |
| `FILE` | File upload only |
| `BOTH` | Text + file |

### Submission lifecycle

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED
                              └──→ REVISION_REQUESTED → (re-submit)
                              └──→ REJECTED
```

Each `Submission` holds:
- `answers[]` — one `SubmissionAnswer` per question
- `files[]` — uploaded files (attached to submission or specific answer)
- `comments[]` — threaded review comments (can be `isInternal` for instructor-only)
- `score`, `feedback`, `reviewCycle` — grading data

---

## 5. Quiz

**Table:** `quizzes`

Auto-graded multiple-choice assessments.

| Key field | Type | Notes |
|---|---|---|
| `type` | QuizType | `PRE_TEST`, `POST_TEST`, or `QUIZ` |
| `maxAttempts` | Int | 0 = unlimited |
| `passingScore` | Float | Percentage threshold (default 60%) |
| `isCourseGate` | Boolean | If true, must pass to progress |
| `courseId` | Int? | Owner course |

### Placement options

A quiz can be attached to the course hierarchy in three ways:

| Join table | Placed on | When shown |
|---|---|---|
| `LessonQuiz` | A specific lesson | Embedded within that lesson |
| `SectionQuiz` | A course section | BEFORE or AFTER the section |
| `Course.preTestQuiz` | The whole course | Before student starts |
| `Course.postTestQuiz` | The whole course | After student finishes |

**Relations out:**

| Relation | Cardinality | Description |
|---|---|---|
| `questions` | 1 → many | Multiple-choice questions |
| `lessonQuizzes` | 1 → many | Lesson placements |
| `sectionQuizzes` | 1 → many | Section placements |
| `attempts` | 1 → many | Student attempts |
| `coursesAsPreTest` | 1 → many | Courses using this as pre-test |
| `coursesAsPostTest` | 1 → many | Courses using this as post-test |

### QuizQuestion → QuizChoice

```
Quiz
 └── QuizQuestion[]
      └── QuizChoice[]   (one or more correct choices)
```

### QuizAttempt lifecycle

```
startedAt (isSubmitted=false)
  → answers recorded (QuizAnswer per question)
  → submitted (isSubmitted=true, score/percentage/isPassed computed)
```

`maxAttempts = 0` means unlimited retries. Each retry creates a new `QuizAttempt` row with incremented `attemptNo`.

---

## 6. Relationship Summary Diagram

```
Course ──────────────────────────────────────────────────────────┐
 │                                                               │
 ├─ CourseSection[]                                              │
 │    ├─ Lesson[] (sectionId set)                                │
 │    └─ SectionQuiz[] ──→ Quiz                                  │
 │                                                               │
 ├─ Lesson[] (sectionId null = unsectioned)                      │
 │    ├─ Assignment[] (lesson-level: lessonId=<id>, courseId=null)│
 │    │    ├─ AssignmentQuestion[]                               │
 │    │    │    └─ SubmissionAnswer[]                            │
 │    │    ├─ AssignmentAttachment[]                             │
 │    │    └─ Submission[]                                       │
 │    │         ├─ SubmissionFile[]                              │
 │    │         ├─ SubmissionAnswer[]                            │
 │    │         └─ SubmissionComment[]                           │
 │    ├─ LessonQuiz[] ──→ Quiz                                   │
 │    │    └─ QuizQuestion[] → QuizChoice[]                      │
 │    └─ LessonAttachment[]                                      │
 │                                                               │
 ├─ Assignment[] (course-level: lessonId=null, courseId=<id>)    │
 │    └─ (same structure as lesson-level assignment above)       │
 │                                                               │
 ├─ preTestQuiz ──→ Quiz                                         │
 └─ postTestQuiz ──→ Quiz                                        │
                                                                 │
Quiz ────────────────────────────────────────────────────────────┘
 ├─ QuizQuestion[]
 │    ├─ QuizChoice[]
 │    └─ QuizAnswer[] (inside QuizAttempt)
 └─ QuizAttempt[]
      └─ QuizAnswer[]
```

---

## 7. Key Business Rules

| Rule | Where enforced |
|---|---|
| Assignment must have either `lessonId` OR `courseId`, not neither | Application layer (createAssignment / createCourseAssignment actions) |
| Only APPROVED enrolled students can see assignments | `canAccessSubmission` in `lib/permissions.ts` |
| One submission per student per assignment | DB: `submissions` has no unique constraint — multi-draft is allowed; app guards re-submission via status check |
| Quiz `maxAttempts = 0` means unlimited | `lib/quiz.ts` attempt-count logic |
| Course publish requires at least one lesson | `publishCourse` action |
| Pre/post-test quiz is optional; pre-test gates enrollment start, post-test gates certificate | Course detail page logic |
| Deleting an assignment with submissions is blocked unless `force=true` (ADMIN only) | `deleteAssignment` action |
| `isCourseGate = true` on a SectionQuiz means student must pass to unlock next section | Section progress logic |
