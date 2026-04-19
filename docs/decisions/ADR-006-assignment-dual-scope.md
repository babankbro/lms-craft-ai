# ADR-006: Assignment Dual Scope (Lesson-Level vs Course-Level)

## Status
Accepted

## Date
2026-04-19

## Context

Initially assignments were always scoped to a lesson (`lessonId` required). A new requirement asked for course-level assignments — work that doesn't belong to any specific lesson (e.g., a final project, a portfolio submission).

The schema needed to support both scopes without duplicating the submission state machine, file upload logic, review flow, or scoring code.

## Decision

Make `lessonId` nullable on `Assignment` and add an optional `courseId` FK:

```
Lesson-level:  lessonId = <id>   courseId = null
Course-level:  lessonId = null   courseId = <id>
```

The same `Submission` model, same status machine (`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED / REVISION_REQUESTED`), same review pages, and same scoring logic handle both scopes.

## Alternatives Considered

### Separate `CourseAssignment` model
- Pros: Clean separation; no nullable FKs
- Cons: Duplicates the entire submission workflow; two separate submission list pages, two review flows, two file upload components
- Rejected: The submission lifecycle is identical in both cases; code duplication would be significant

### Polymorphic association (assignableType + assignableId)
- Pros: Extensible to other parent types
- Cons: Loses referential integrity; Prisma doesn't support polymorphic relations natively; harder to query
- Rejected: Only two scopes are needed; the nullable FK approach is simpler and retains FK constraints

## Consequences

- All queries on `Assignment` must account for both cases. Lesson-level: `where: { lessonId: <id> }`. Course-level: `where: { courseId: <id>, lessonId: null }`.
- Scoring (`lib/course-score.ts`) distinguishes: `lessonId != null AND lesson.courseId = courseId` for lesson assignments; `courseId = courseId AND lessonId IS NULL` for course assignments.
- The application layer (not the DB) enforces "either lessonId or courseId, not neither" — see `createAssignment` and `createCourseAssignment` server actions.
- Deleting a course also cascades to `assignments` via the `courseId` FK.
- The `Assignment.maxScore` field (optional Float) works identically for both scopes.
