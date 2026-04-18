# Plan: Recall Submission (SUBMITTED → DRAFT before deadline)

## Feature

A student who has submitted an assignment can **withdraw it back to DRAFT** to make edits,
as long as:
1. The submission is in `SUBMITTED` state (not `UNDER_REVIEW`, `APPROVED`, `REJECTED`)
2. The assignment `dueDate` has not passed — OR the assignment has no due date

Once recalled, the submission returns to `DRAFT` and the student can edit answers, swap
files, and re-submit.

---

## Dependency Graph

```
Assignment.dueDate (nullable)
  └── recallable check: status === SUBMITTED && (no dueDate || now < dueDate)
        │
        ├── lib/submission-state.ts
        │     ├── TRANSITIONS: add SUBMITTED → DRAFT
        │     └── canRecallSubmission(status, dueDate): boolean  ← new helper
        │
        ├── submit/actions.ts
        │     └── recallSubmission(submissionId)  ← new server action
        │           ├── requireStudentOwnsSubmission()
        │           ├── canRecallSubmission() guard
        │           └── prisma.submission.update(status: DRAFT, submittedAt: null)
        │
        └── _components/assignment-panel.tsx
              ├── receives dueDate (already in Assignment type ✓)
              ├── canRecall = submission.status === "SUBMITTED" && !isPastDue(dueDate)
              └── "ถอนงาน" button → calls recallSubmission() → sets local status DRAFT
```

---

## Vertical Slices

### Phase 1 — State machine + helper
**Checkpoint:** `canRecallSubmission` logic is unit-tested and correct.

- **T1** Add `SUBMITTED → DRAFT` transition and `canRecallSubmission` helper
  - AC: `canTransition("SUBMITTED", "DRAFT")` → `true`
  - AC: `canRecallSubmission("SUBMITTED", futureDate)` → `true`
  - AC: `canRecallSubmission("SUBMITTED", pastDate)` → `false`
  - AC: `canRecallSubmission("SUBMITTED", null)` → `true` (no deadline = always recallable)
  - AC: `canRecallSubmission("UNDER_REVIEW", futureDate)` → `false`
  - Verify: unit tests pass in `submission-state.test.ts`

### Phase 2 — Server action
**Checkpoint:** Server correctly enforces the recall guard and updates DB.

- **T2** Add `recallSubmission(submissionId)` to `submit/actions.ts`
  - AC: Verifies student owns the submission
  - AC: Calls `canRecallSubmission` — throws if not recallable
  - AC: Updates `status → DRAFT`, clears `submittedAt`
  - AC: Revalidates lesson and submissions paths
  - Verify: integration test or manual DB check

### Phase 3 — UI button
**Checkpoint:** "ถอนงาน" button appears only when recall is allowed; clicking it works end-to-end.

- **T3** Add "ถอนงาน" (Recall) button to `assignment-panel.tsx`
  - AC: Button shown only when `submission.status === "SUBMITTED"` AND `now < dueDate` (or no dueDate)
  - AC: Button hidden when submission is `UNDER_REVIEW`, `APPROVED`, `REJECTED`
  - AC: Button hidden when `dueDate` is in the past
  - AC: Clicking calls `recallSubmission()` → local state flips to `DRAFT` → edit panel re-enables
  - Verify: Visit lesson as student1, submit, see button, click it, see edit panel

---

## Checkpoints Summary

| After | Gate |
|-------|------|
| T1 | Unit tests for state machine pass |
| T2 | Server action rejects past-deadline / wrong-status recall |
| T3 | UI button appears and disappears correctly; full cycle works |

---

## Assumptions

1. `UNDER_REVIEW` blocks recall — mentor has already claimed the submission
2. Clearing `submittedAt` is correct so the submission looks like a fresh draft
3. `dueDate` is `null` for most seed assignments → recall always available in dev
4. No email/notification needed when student recalls (silent withdrawal)
