# 07 · Backlog — merged into 06

> **This document was merged into [06-implementation-plan.md](./06-implementation-plan.md) on 2026-04-18.**
> The single canonical plan now lives there. This file is kept as a cross-reference so existing links don't rot.

## Where old items went

| Old ID | Old title | New location |
|--------|-----------|--------------|
| B-1 | Enrollment approval UX refinements | 06 §2.3 — P1-9, P1-13, P1-14 |
| B-2 | Course sections UX | 06 §2.1 — P1-10 (authoring), student collapsible groups are part of the same slice |
| B-3 | Quiz gates (PRE / Section / POST) | 06 §0 — shipped in Phase 1; enforcement lives in `lib/course-gates.ts` |
| B-4 | Group-level analytics | 06 §3 — P2-7 |
| B-5 | Rubric-driven evaluation grading | 06 §4 — P3-6 (editor shell tracked as P1-4) |
| B-6 | Notification delivery channels | 06 §4 — P3-7 (email is the first channel at P1-6) |
| B-7 | Soft delete + audit log | 06 §4 — P3-8 |
| B-8 | i18n scaffolding | 06 §4 — P3-9 |

## Why the merge

Keeping priorities, design, and shipped-state in separate files meant updates went stale. The 2026-04-18 code audit revealed several items labelled "planned" here were already shipped (`QuizPlacement`, `AssignmentAttachment`, `requireOwnStudent`, the UNDER_REVIEW edit-lock). One canonical plan with `[x] / [~] / [ ]` states avoids that drift.

## If you are promoting a new idea

1. Open it as a row in 06 at the priority you think it warrants.
2. If it needs design discussion first, write the design inline in the row or link to an archived design doc under `doc/archive/`.
3. Do not re-create this file as a parallel list.
