# Task List — plan_admin_course_panel

## Status: COMPLETE

---

# Task List — quiz_lesson_section_linking

## Status: IN PROGRESS

### Phase 1 — Seed + Action
- [x] **T1** — Seed LessonQuiz data (link quizzes to lesson1 + lesson2)
- [x] **T2** — New `linkQuizTarget` action in `app/teach/[courseId]/quizzes/actions.ts`

### Phase 2 — Quiz Editor UI
- [x] **T3** — Teach quiz editor: replace per-row list with dropdown (`/teach/[courseId]/quizzes/[quizId]`)
- [x] **T4** — Admin quiz editor: same dropdown (`/admin/courses/[id]/quizzes/[quizId]`)

### Phase 3 — Teach Workbench
- [x] **T5** — Teach workbench: per-lesson quiz type badges (`/teach/[courseId]`)

### Phase 1 — Unified View + Section Management
- [x] **P1-T1** — Unified course tree view (sections → lessons → quiz/assignment counts)
- [x] **P1-T2** — Section CRUD in admin panel (create, rename, delete)

### Phase 2 — Assignment Full CRUD in Admin
- [x] **P2-T3** — Assignment edit page (course-level + lesson-level) with questions + attachments
- [x] **P2-T4** — Lesson editor: section selector + assignment panel + quiz count

### Phase 3 — Quiz Full CRUD + Linking
- [x] **P3-T5** — Quiz create page in admin (/admin/courses/[id]/quizzes/new)
- [x] **P3-T6** — Quiz edit page in admin — self-contained, no teach bounce
- [x] **P3-T7** — Lesson ↔ Quiz linking (covered by P3-T6 quiz editor + P2-T4 lesson editor)

### Phase 4 — Section ↔ Quiz Linking
- [x] **P4-T8** — Section ↔ Quiz linking with BEFORE/AFTER placement + gate toggle
