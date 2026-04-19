# ADR-005: Weighted Score — Null Component Redistribution

## Status
Accepted

## Date
2026-04-19

## Context

The course score is a weighted average of up to four components:
1. Lesson post-tests (quizzes linked to lessons)
2. Section post-tests (quizzes placed after a section)
3. Lesson assignments
4. Course-level assignments

The instructor configures weights (e.g. 40/20/30/10) that must sum to 100. But not every course uses all four components — a course may have no section quizzes, or no course-level assignments.

The question is: what should a student's final score be when some components have no items?

### Option A — Zero weight (strict)
A component with no items contributes 0 to the numerator and its full weight to the denominator. A student in a course with no section quizzes effectively loses 20 points permanently.

### Option B — Null redistribution
Components with `score = null` (no items, or items but no attempts) are excluded from both numerator and denominator. The active components' weights are renormalized over their sum.

## Decision

Use **null redistribution (Option B)** via `computeWeightedFinal` in `lib/course-score.ts`:

```ts
const active = components.filter(c => c.score !== null && c.weight > 0);
const totalWeight = active.reduce((s, c) => s + c.weight, 0);
const weighted = active.reduce((s, c) => s + c.score! * c.weight, 0);
return Math.round((weighted / totalWeight) * 100) / 100;
```

## Why Option B

- A student should not be penalized for a course structure they have no control over
- A course with only lesson quizzes should grade on 100% quiz performance, not 80% (the remaining 20% being a permanent zero for "missing" section quizzes)
- Instructors set weights for the components they actually use; unused components remain at 25/25/25/25 default and are excluded from the student's score as long as no items exist

## Important nuance: "no items" vs "not attempted"

`score = null` covers both cases:
- The course has zero section quizzes → `itemCount = 0`, `score = null` → excluded
- The course has section quizzes but the student hasn't attempted any → `itemCount > 0`, `score = null` → also excluded from the denominator

This means a student who ignores all quizzes is not scored on those quizzes — they get a score only from what they've attempted. This is intentional: the score represents "how well did the student do on what they engaged with" rather than "what percentage of the total possible curriculum did they complete."

**Roster display (`/teach/[courseId]/scores`)** shows `— (N)` to distinguish "has N items but zero attempts" from `—` which means "course has no items of this type".

## Consequences

- `lib/course-score.ts:computeWeightedFinal` is the single implementation point; it is unit-tested in `tests/unit/course-score-calculator.test.ts`
- The final score is `null` (not 0) when the student has attempted nothing — the roster shows `—`
- Config weights are stored as-is (not auto-renormalized in DB); renormalization happens only at display/compute time
- The score-config UI enforces that saved weights sum to 100, but the calculation works correctly even if weights don't sum to 100 (redistribution handles it)
