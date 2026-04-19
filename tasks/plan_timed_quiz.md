# Plan: Timed Quiz

## Status: PENDING

## Goal
Add an optional countdown timer to quizzes. When the timer expires the attempt auto-submits. Instructors set `timeLimitSec` on a quiz; students see a live countdown.

## Context

- `Quiz` model has no time limit field
- `QuizAttempt.startedAt` already exists — elapsed time = `now - startedAt`
- Quiz answer page: `app/courses/[slug]/quiz/[quizId]/_components/` — client component
- Auto-submit must call the existing `submitQuiz` server action
- Time limit = 0 means unlimited (consistent with `maxAttempts = 0`)

## Dependency Graph

```
Quiz.timeLimitSec schema field
  └── T1 — schema + migration

Quiz editor UI (teach + admin)
  └── T2 — add timeLimitSec number input to quiz edit forms

Quiz attempt page
  └── T3 — QuizTimer client component
              └── reads timeLimitSec + startedAt
              └── counts down
              └── calls submitQuiz when reaches 0
  └── T4 — server-side enforcement: submitQuiz checks startedAt + timeLimitSec → rejects late submissions

Quiz list display
  └── T5 — show time limit badge on quiz cards (student + instructor views)
```

## Vertical Slices

### T1 — Schema
- Add `timeLimitSec Int @default(0) @map("time_limit_sec")` to `Quiz`
- Run `prisma migrate dev --name add_quiz_time_limit`
- **AC:** Migration applies; `timeLimitSec` defaults to 0 (no limit)

### T2 — Quiz editor inputs
- `app/teach/[courseId]/quizzes/[quizId]/page.tsx` — add "เวลาจำกัด (วินาที)" number input (0 = ไม่จำกัด)
- Same in `app/admin/courses/[id]/quizzes/[quizId]/page.tsx`
- Server actions: include `timeLimitSec` in `updateQuiz`
- **AC:** Setting 300 saves; setting 0 shows "ไม่จำกัด" placeholder

### T3 — QuizTimer client component
- `app/courses/[slug]/quiz/[quizId]/_components/quiz-timer.tsx` (new, client)
- Props: `{ timeLimitSec: number; startedAt: Date; onExpire: () => void }`
- Computes `remaining = timeLimitSec - (Date.now() - startedAt.getTime()) / 1000`
- Counts down with `useEffect` interval; calls `onExpire()` when remaining ≤ 0
- Display: `MM:SS` format; turns amber at 20%, red at 10%
- Rendered at top of quiz form only when `timeLimitSec > 0`
- `onExpire` triggers the submit form action programmatically
- Unit tests in `tests/unit/quiz-timer-logic.test.ts`: remaining calculation, boundary at 0
- **AC:** Timer counts down; auto-submits when it hits 0; does not appear when `timeLimitSec === 0`

### T4 — Server-side enforcement
- In `submitQuiz` server action: if `quiz.timeLimitSec > 0`, check `attempt.startedAt + timeLimitSec < now`
- If expired (with 5 s grace period), still accept submission but flag it (or accept — decide in implementation: accept to avoid punishing network lag, log a warning)
- **AC:** Submission received within grace window is accepted; unit test covers boundary

### T5 — Display badges
- Show "⏱ N นาที" badge on quiz cards in the lesson page and course overview
- **AC:** Quiz with timeLimitSec > 0 shows time badge; quiz with 0 shows nothing

## Checkpoints

| After | Gate |
|-------|------|
| T1 | Schema + default 0 = backward compatible |
| T2 | Editors save time limit correctly |
| T3 | Timer counts down and auto-submits |
| T4 | Server validates; grace window prevents false failures |
| T5 | Time limit visible to students before starting |
