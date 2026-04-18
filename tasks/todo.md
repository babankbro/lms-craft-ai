# Task List — Recall from Submissions Pages

## Phase 1 — Server action
- [ ] T1: `app/submissions/actions.ts` — `recallSubmissionFromList(submissionId)`
  - Create file with `"use server"`
  - `requireAuth()` → get user
  - Fetch submission with `{ studentId, status, assignment: { dueDate, lesson: { id, course: { slug } } } }`
  - Throw if `sub.studentId !== user.id`
  - Import `canRecallSubmission` from `@/lib/submission-state` — throw if false
  - `prisma.submission.update({ status: "DRAFT", submittedAt: null })`
  - `revalidatePath("/submissions")`
  - `revalidatePath("/courses/${slug}/lessons/${lessonId}")`
  - Verify: call with wrong user → Forbidden; call with APPROVED status → throws

## Phase 2 — RecallButton client component
- [ ] T2: `app/submissions/_components/recall-button.tsx`
  - `"use client"`
  - Props: `{ submissionId: number }`
  - `useTransition` for pending state
  - On click: call `recallSubmissionFromList(submissionId)`
  - Render: `<Button variant="outline" disabled={isPending}>` with `Undo2` icon
  - Show inline error string if action throws
  - Verify: renders correctly; disabled while pending

## Phase 3 — List page
- [ ] T3: `app/submissions/page.tsx`
  - Add `dueDate: true` inside `assignment` include
  - Import `canRecallSubmission` from `@/lib/submission-state`
  - Import `RecallButton` from `./_components/recall-button`
  - Add `<TableHead>การดำเนินการ</TableHead>` column
  - In each row: `{canRecallSubmission(sub.status, sub.assignment.dueDate) && <RecallButton submissionId={sub.id} />}`
  - Verify: Login as student1 → `/submissions` → SUBMITTED row has "ถอนงาน" button

## Phase 4 — Detail page
- [ ] T4: `app/submissions/[id]/page.tsx`
  - Add `dueDate: true` to `assignment` include in the query
  - Import `canRecallSubmission` and `RecallButton`
  - In the header section (next to `<Badge>`): render `<RecallButton>` when `isOwner && canRecallSubmission(submission.status, submission.assignment.dueDate)`
  - Verify: Visit `/submissions/{id}` as student with SUBMITTED → see button → click → page refreshes to DRAFT state → button gone
