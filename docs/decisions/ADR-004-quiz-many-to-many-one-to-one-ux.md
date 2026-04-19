# ADR-004: Quiz Placement — Many-to-Many Schema, One-to-One UX

## Status
Accepted

## Date
2026-04-19

## Context

A quiz needs to be "placed" somewhere in the course hierarchy so students see it at the right time. Options for placement:
- Embedded in a specific lesson (pre or post lesson)
- Before or after a course section
- As the whole-course pre-test or post-test

The question was whether to model this as many-to-many (a quiz can be placed multiple times) or one-to-one (a quiz belongs to exactly one location).

## Decision

Keep the **schema many-to-many** (via `LessonQuiz` and `SectionQuiz` join tables) but present a **one-to-one UI**: a single dropdown "link this quiz to: [lesson / section / none]".

When the user selects a new target, the action:
1. Deletes all existing `LessonQuiz` rows for this quiz within this course
2. Deletes all existing `SectionQuiz` rows for this quiz within this course
3. Creates the new link

## Why Not One-to-One Schema

A strict one-to-one schema (single nullable FK on Quiz) would:
- Make it impossible to add multi-placement later without a migration
- Be slightly awkward because a quiz can also be a course pre/post-test (already a direct FK on `Course`), which is a third placement type

## Why Not Many-to-Many UI

Allowing an instructor to link a quiz to multiple lessons at once:
- Creates confusion about where students encounter it
- Complicates attempt deduplication (which lesson's badge shows as "done"?)
- Not needed in practice — quizzes are authored per-lesson/section

## Consequences

- `app/teach/[courseId]/quizzes/actions.ts` has `linkQuizTarget` which always detaches before attaching
- The same pattern is in `app/admin/courses/[id]/quizzes/[quizId]`
- Scoring (`lib/course-score.ts`) aggregates across all `LessonQuiz` / `SectionQuiz` links — works correctly even if (in future) a quiz is placed in multiple locations
- If many-to-many UI is ever needed, only the frontend changes — the schema already supports it
