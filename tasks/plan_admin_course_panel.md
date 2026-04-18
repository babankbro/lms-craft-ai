# Plan: Admin Course Panel — Full CRUD + Unified View

## Objective

Build a complete admin-path course panel at `/admin/courses/[id]` that:
1. Shows sections → lessons → quizzes → assignments as a unified tree view
2. Allows assignments with structured questions (TEXT / FILE / BOTH) and multi-file attachments
3. Allows quizzes and assignments to be linked to a section, lesson, or course
4. Provides full CRUD for every entity without bouncing to the `/teach` path

---

## Audit: What Already Exists

### Admin path (`/admin/courses/[id]/...`)

| Feature | Status | Gap |
|---|---|---|
| Course settings CRUD | ✅ | — |
| Lesson list (flat table) | ✅ | No section grouping; no quiz/assignment counts |
| Lesson create | ✅ | No section selector |
| Lesson edit | ✅ | No section selector; no linked quiz/assignment panels |
| Course-level assignment list | ✅ | — |
| Course-level assignment create | ✅ | — |
| **Course-level assignment edit** | ❌ | No edit page exists |
| Lesson-level assignment CRUD | ❌ | Admin must use teach path |
| Quiz list (in course detail) | ✅ | Edit bounces to teach path |
| **Quiz create (admin UI)** | ❌ | `actions.ts` exists, page missing |
| **Quiz edit (admin UI)** | ❌ | Bounces to `/teach/[id]/quizzes/[id]` |
| Section view | ❌ | Sections not shown in admin |
| **Section CRUD** | ❌ | Only available in teach drag-drop UI |
| Lesson ↔ Quiz linking | ❌ | Only in teach quiz editor |
| Section ↔ Quiz linking | ❌ | Only in teach section-list-sortable |
| **Unified tree view** | ❌ | Not implemented |

### Reusable server actions (already exist, free to call from admin)

| Action | Location |
|---|---|
| `createSection / updateSection / deleteSection / reorderSections` | `app/teach/[courseId]/sections/actions.ts` |
| `attachSectionQuiz / detachSectionQuiz` | `app/teach/[courseId]/sections/actions.ts` |
| `attachQuizToLesson / detachQuizFromLesson` | `app/teach/actions.ts` |
| `createQuiz / updateQuiz / deleteQuiz / addQuestion / addChoice / ...` | `app/teach/actions.ts` |
| `createAssignment / updateAssignment / deleteAssignment` | `app/teach/[courseId]/assignments/actions.ts` |
| `addQuestion / deleteQuestion` (assignment) | `app/teach/[courseId]/assignments/[id]/question-actions.ts` |
| `createCourseAssignment / deleteCourseAssignment` | `app/admin/courses/[id]/assignments/actions.ts` |

---

## Dependency Graph

```
P1-T1 — Unified tree view (read-only)
  └── needs: sections + lessons + quiz counts + assignment counts in one query

P1-T2 — Section CRUD in admin
  └── reuses: createSection / updateSection / deleteSection actions (teach path)

P2-T3 — Assignment edit page (course-level + lesson-level)
  └── new file: app/admin/courses/[id]/assignments/[assignmentId]/page.tsx
  └── reuses: updateAssignment, addQuestion, deleteQuestion, attachment-upload-panel

P2-T4 — Lesson editor: section selector + assignment panel + quiz count
  └── extends: app/admin/courses/[id]/lessons/[lessonId]/page.tsx
  └── reuses: createAssignment action, assignment list query

P3-T5 — Quiz create page in admin
  └── new file: app/admin/courses/[id]/quizzes/new/page.tsx
  └── reuses: createQuiz action from app/admin/courses/[id]/quizzes/actions.ts

P3-T6 — Quiz edit page in admin (self-contained, no teach bounce)
  └── new file: app/admin/courses/[id]/quizzes/[quizId]/page.tsx
  └── reuses: updateQuiz, addQuestion, deleteQuestion, addChoice, deleteChoice from teach/actions.ts

P3-T7 — Lesson ↔ Quiz linking in admin
  └── added to: lesson editor page (T4 already touches this file)
  └── reuses: attachQuizToLesson / detachQuizFromLesson

P4-T8 — Section ↔ Quiz linking in admin
  └── added to: unified tree view (P1-T1) or section editor card
  └── reuses: attachSectionQuiz / detachSectionQuiz
```

---

## Vertical Slices

### Phase 1 — Unified View + Section Management

---

**P1-T1 — Unified Course Tree View**

File:
- `app/admin/courses/[id]/page.tsx` — replace flat lesson table with a sectioned tree card

Query:
```ts
course = prisma.course.findUnique({
  include: {
    sections: {
      orderBy: { order: "asc" },
      include: {
        lessons: { orderBy: { order: "asc" }, include: { _count: { select: { assignments: true, lessonQuizzes: true } } } },
        sectionQuizzes: { include: { quiz: { select: { id: true, title: true, type: true } } } },
      },
    },
    lessons: {
      where: { sectionId: null }, orderBy: { order: "asc" },
      include: { _count: { select: { assignments: true, lessonQuizzes: true } } },
    },
    // ...existing quizzes, assignments, etc.
  }
})
```

UI layout:
```
📁 หมวด A
   └── 📄 บทที่ 1  [2 งาน · 1 แบบทดสอบ]  [Edit]
   └── 📄 บทที่ 2  [0 งาน · 0 แบบทดสอบ]  [Edit]
   └── 🧩 Quiz: ข้อสอบก่อนหมวด A  [PRE / AFTER]  [Edit]
📁 หมวด B ...
📄 (ไม่มีหมวด) บทที่ 3
```

AC:
- Sections shown in order with their lessons grouped inside
- Unsectioned lessons shown at bottom under "ไม่มีหมวด"
- Each lesson row shows assignment count, quiz count, edit link
- Each section shows attached SectionQuizzes with placement badge
- Empty sections shown (to allow attaching quizzes before lessons exist)

Verify: `/admin/courses/1` shows seeded sections + their lessons

---

**P1-T2 — Section CRUD in admin**

File:
- `app/admin/courses/[id]/page.tsx` — add "จัดการหมวด" card with: create form + rename inline + delete button per section

Reuses server actions from `app/teach/[courseId]/sections/actions.ts` (no new actions needed).

AC:
- Admin can create a section with title
- Admin can rename a section (inline edit or modal)
- Admin can delete a section (lessons are unassigned, not deleted — matches existing `deleteSection` behavior)
- Section list reflects changes immediately (revalidatePath)

Verify: Create section → lesson edit shows it in dropdown (T4 dependency)

---

### Phase 2 — Assignment Full CRUD in Admin

---

**P2-T3 — Assignment Edit Page**

New files:
- `app/admin/courses/[id]/assignments/[assignmentId]/page.tsx`

Sections:
1. **Basic settings** — title, description, dueDate, maxFileSizeMB, allowedTypes (form → `updateAssignment`)
2. **Questions** — list existing questions; form to add (prompt, responseType: TEXT/FILE/BOTH, required); delete button per question. Reuses `addQuestion` / `deleteQuestion` from question-actions.ts
3. **Attachments** — instructor files: PROMPT / GUIDE / EXAMPLE kinds, with visibility setting. Reuse `AttachmentUploadPanel` component from `app/teach/[courseId]/assignments/[id]/_components/`.

AC:
- Can edit title/description/dueDate of course-level assignment
- Can add a TEXT question, FILE question, BOTH question
- Can delete a question (blocked if has answers)
- Can upload an attachment with kind + visibility
- Can delete an attachment

Verify: Edit seeded "Final Reflection" assignment → add a FILE question → confirm question appears

---

**P2-T4 — Lesson Editor: Section Selector + Assignment Panel**

File:
- `app/admin/courses/[id]/lessons/[lessonId]/page.tsx` — extend existing page

Changes:
1. Add `sectionId` selector (reuse same pattern as teach path, T2 already done there)
2. Add "งานมอบหมาย" card — query `assignment.findMany({ where: { lessonId } })`, list with edit links → `/admin/courses/[id]/assignments/[assignmentId]`
3. Add "สร้างงาน" link → `/admin/courses/[id]/assignments/new?lessonId=[lessonId]` — update the `new/page.tsx` to also accept `lessonId` and call `createAssignment(lessonId, courseId, formData)` (reuse teach action)
4. Add "แบบทดสอบที่เชื่อม" count badge with link to quiz linking (T7)

AC:
- Lesson edit shows which section it belongs to; can change it
- All lesson-level assignments listed with edit links
- "สร้างงาน" navigates to create form pre-filled with lessonId
- Assignment edit link opens the new edit page (T3)

Verify: `/admin/courses/1/lessons/1` shows the seeded assignment "แผนการจัดการเรียนรู้"

---

### Phase 3 — Quiz Full CRUD + Linking in Admin

---

**P3-T5 — Quiz Create Page in Admin**

New file:
- `app/admin/courses/[id]/quizzes/new/page.tsx`

Form fields: title, type (PRE_TEST / POST_TEST / QUIZ), passingScore, maxAttempts.
On submit → calls `createQuiz(courseId, formData)` from existing `app/admin/courses/[id]/quizzes/actions.ts` (action already exists).

AC:
- Admin can create a quiz of any type from admin path
- After creation, redirected to the quiz edit page (T6)
- Quiz appears in the course detail quiz list

Verify: Create quiz → appears in course detail → link opens edit page (T6)

---

**P3-T6 — Quiz Edit Page in Admin (self-contained)**

New file:
- `app/admin/courses/[id]/quizzes/[quizId]/page.tsx`

Sections (mirrors teach quiz editor but under admin path):
1. **Quiz settings** — title, type, passingScore, maxAttempts → `updateQuiz`
2. **Questions** — list + add (questionText, points) → `addQuestion` / `updateQuestion` / `deleteQuestion`
3. **Choices** — per question: list + add (choiceText, isCorrect) → `addChoice` / `updateChoice` / `deleteChoice`
4. **Danger zone** — delete quiz (blocked if has attempts)

Reuses all existing server actions from `app/teach/actions.ts`.

AC:
- Admin can edit quiz settings without leaving admin path
- Admin can add/edit/delete questions and choices
- Correct answer(s) can be marked
- Delete blocked when quiz has attempts

Verify: Edit quiz → add question with 4 choices, mark 1 correct → `/courses/[slug]` quiz shows the new question

---

**P3-T7 — Lesson ↔ Quiz Linking in Admin**

File:
- `app/admin/courses/[id]/lessons/[lessonId]/page.tsx` — add "แบบทดสอบที่เชื่อม" card

Shows currently linked quizzes (from `lessonQuizzes` include) + all course quizzes in a dropdown to attach. Delete button to detach.

Reuses `attachQuizToLesson` / `detachQuizFromLesson` from `app/teach/actions.ts`.

AC:
- Linked quizzes shown with edit links
- Dropdown lists all course quizzes not yet linked
- Attach adds the link; Detach removes it
- Changes visible immediately on lesson page

Verify: Link quiz to lesson 1 → `/courses/[slug]/lessons/1` shows quiz card

---

### Phase 4 — Section ↔ Quiz Linking in Admin

---

**P4-T8 — Section ↔ Quiz Linking in Admin**

File:
- `app/admin/courses/[id]/page.tsx` — extend tree view (T1) to show attach/detach quiz per section

Each section row in the tree view gets a "เชื่อมแบบทดสอบ" inline form:
- Select quiz from course quiz list
- Select placement: BEFORE / AFTER
- Toggle isGate

Reuses `attachSectionQuiz` / `detachSectionQuiz` from `app/teach/[courseId]/sections/actions.ts`.

AC:
- Admin can attach a quiz to a section with BEFORE/AFTER placement
- `isGate` can be toggled
- Attached section quizzes shown in tree view with placement badge
- Detach removes the link

Verify: Attach quiz to section → student course page shows quiz gate at section boundary

---

## Checkpoints

| After | Gate |
|---|---|
| P1-T1 | Tree view shows sections + lessons + quiz/assignment counts correctly |
| P1-T2 | Section can be created, renamed, deleted from admin — verified in lesson dropdown |
| P2-T3 | Assignment edit page: save title, add TEXT question, upload attachment — all work |
| P2-T4 | Lesson editor shows assignments + quiz count + section selector — all correct |
| P3-T6 | Quiz CRUD entirely within admin path — no teach bounce needed |
| P3-T7 | Lesson-quiz link created in admin → visible to student |
| P4-T8 | Section-quiz gate set in admin → student sees gate at section boundary |

---

## Assumptions

1. All server actions are reused from teach path — no duplicate logic
2. Quiz edit page in admin (`T6`) mirrors the teach quiz editor in functionality; it does NOT need drag-drop reorder (form-based order field is sufficient)
3. Assignment attachment upload still uses the existing `POST /api/upload` route — no new upload endpoint needed
4. `AttachmentUploadPanel` component from teach path is reusable directly in admin path (no props changes needed)
5. Section reorder stays drag-drop only in teach path; admin only gets create/rename/delete (T2) — reorder is out of scope for this plan
6. No new DB migrations needed — all models (`CourseSection`, `SectionQuiz`, `LessonQuiz`, etc.) already exist in schema
