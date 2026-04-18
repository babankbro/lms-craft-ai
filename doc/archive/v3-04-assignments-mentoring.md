# Mini LMS v3 — Doc 4/5: Phase 3 — Assignments, Submissions & Mentoring

> **Phase window:** Week 4 – Week 6 (≈ Days 25–42)
> **Payment tranche:** Closes out §2.1 (70%) — Day 45 milestone
> **Prereq:** Phases 1 & 2 live; STUDENT ↔ MENTOR pairings populated.
> **Last doc↔code sync:** 2026-04-17

---

## 0. As-Built Status (doc↔code drift)

Phase 3 review workflow is shipped end-to-end. Divergences:

| # | Design says | Code has | Notes |
|---|---|---|---|
| 1 | Submission schema: `firstSubmittedAt`, `reviewCycle`, `SubmissionComment.isInternal` (§2) | ✅ All three fields present in `prisma/schema.prisma` (`Submission.firstSubmittedAt`, `Submission.reviewCycle @default(1)`, `SubmissionComment.isInternal @default(false)`) | Matches. |
| 2 | State machine: `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED \| REVISION_REQUESTED` (§2) | ✅ `SubmissionStatus` enum matches exactly (plus unused `REJECTED` from v2 kept for back-compat) | Matches. |
| 3 | `UNDER_REVIEW` advisory lock via `reviewedBy` (§2, §4.3-4) | Not enforced. Review actions transition directly `SUBMITTED → APPROVED`/`REVISION_REQUESTED` without passing through `UNDER_REVIEW`, and there is no 10-min timeout or "force-claim" banner UI. | Double-review is possible but harmless (last-write-wins on `score`+`feedback`). Enhancement, not a blocker. |
| 4 | `/api/files/[...key]` enforces per-submission ownership (§6.1) | Only `lessons/{id}/…` enrollment check is enforced; other prefixes (including `submissions/…`) pass straight through to a presigned redirect for any authenticated user | **Known security gap.** A logged-in user can fetch any submission file if they guess or see the key. Prioritize for pre-production hardening. |
| 5 | Inline preview endpoint `/api/files/preview/[...key]` (§3.4) | ✅ Implemented at `app/api/files/preview/[...key]/route.ts` | Matches. |
| 6 | Magic-byte MIME sniffing via `file-type` npm (§6.3) | Not installed; declared-MIME allowlist only | Same gap as Doc 3 §0 item 4. |
| 7 | `requireOwnStudent` enforces MENTOR ↔ mentee pairing (§5) | Stub in `lib/permissions.ts` (see Doc 2 §0 item 3) | MENTORs can currently access any submission once they reach `/review/[id]`. Gate relies on middleware role check + UI filtering only. |
| 8 | State-transition validator rejects illegal transitions with typed error (§5) | `app/review/actions.ts` performs the transitions but does not have a formal state-machine validator module — valid transitions are implicit in the handler code | Behavior is correct for the flows exercised; formal validator is a future cleanup. |
| 9 | Notification mappings in §7 table | Mostly implemented (`SUBMISSION_RECEIVED` on `SUBMITTED`, `SUBMISSION_REVIEWED` on `APPROVED`, `REVISION_REQUESTED` on revision, `FEEDBACK_RECEIVED` on new non-internal comment) | Verify wiring in `app/review/actions.ts` before UAT. |
| 10 | `/submissions` student list + `/submissions/[id]` detail (§3.2) | ✅ Both pages exist | Matches. |
| 11 | Orphaned-MinIO GC nightly cron (§11) | Not implemented | Deferred to Doc 5 §8 ops work; still open. |

---

## 1. Scope

Deliver the file-upload assignment workflow and the review loop between STUDENT and MENTOR. This is the phase that earns TOR clause 2.1.2(5) ("upload งานและแจ้งตรวจเสร็จ") and 2.1.3 ครู CAM (review + feedback).

### 1.1 In Scope

- Assignment CRUD (by INSTRUCTOR/ADMIN) attached to a lesson
- Assignment upload (by STUDENT) with multi-file support + progress bar
- Submission state machine: `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | REVISION_REQUESTED`
- Review queue for MENTOR (scoped to own mentees) and for INSTRUCTOR/ADMIN (all)
- File preview — PDF inline, images inline, others download-only
- Score + feedback form; threaded comments visible to both sides
- In-app notification on each state transition (bell icon already ships in Phase 1 infra)
- MENTOR mentee progress page (`/mentees`, `/mentees/[id]`)

### 1.2 Out of Scope

- Email/SMS delivery of notifications (in-app only per v2 spec §7)
- Evaluation rounds — Doc 5
- Certificate generation — Doc 5
- Observation videos — Doc 5

---

## 2. Schema (mostly unchanged from v2)

All models below already exist in v2 and carry over. We only add:

```prisma
model Submission {
  // existing fields
  firstSubmittedAt DateTime?      // NEW — tracks initial submit; preserved across revisions
  reviewCycle      Int      @default(1)   // NEW — increments on REVISION_REQUESTED → resubmit
}

model SubmissionComment {
  // existing fields
  isInternal Boolean @default(false)   // NEW — if true, only visible to MENTOR/INSTRUCTOR/ADMIN (not STUDENT)
}
```

Migration:

```sql
ALTER TABLE "Submission"
  ADD COLUMN "firstSubmittedAt" TIMESTAMP,
  ADD COLUMN "reviewCycle"      INTEGER NOT NULL DEFAULT 1;

UPDATE "Submission" SET "firstSubmittedAt" = "submittedAt" WHERE "submittedAt" IS NOT NULL;

ALTER TABLE "SubmissionComment"
  ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;
```

### State Machine

```
     ┌────────┐
     │ DRAFT  │  ◄──── student uploads first file
     └───┬────┘
         │ submit (student clicks "Submit")
         ▼
    ┌──────────┐
    │SUBMITTED │ ◄──────── revision re-submit
    └────┬─────┘               ▲
         │ reviewer opens      │
         ▼                     │
  ┌────────────┐               │
  │UNDER_REVIEW│               │
  └─────┬──────┘               │
        │                      │
   ┌────┴─────┐                │
   │          │                │
   ▼          ▼                │
┌────────┐ ┌───────────────┐   │
│APPROVED│ │REVISION_      │───┘
│        │ │REQUESTED      │
└────────┘ └───────────────┘
```

**Rules:**
- `APPROVED` is terminal (unlock certificate path in Doc 5).
- `UNDER_REVIEW` is set the moment a reviewer opens the detail page and has not yet submitted a decision — prevents two reviewers acting on the same submission simultaneously (advisory lock via `reviewedBy` until timeout).
- On `REVISION_REQUESTED → SUBMITTED` re-submission, `reviewCycle += 1` and old files stay attached (history preserved).

---

## 3. Routes

### 3.1 INSTRUCTOR/ADMIN

| Route | Purpose |
|---|---|
| `/teach/[courseId]/assignments` | List assignments for this course |
| `/teach/[courseId]/assignments/new?lessonId=...` | Create assignment |
| `/teach/[courseId]/assignments/[id]` | Edit assignment (title, description, maxFileSize, allowedTypes, dueDate) |

### 3.2 STUDENT

| Route | Purpose |
|---|---|
| `/courses/[slug]/lessons/[id]` | (extended) — shows linked assignment(s) at the bottom with upload dropzone + submission history |
| `/submissions` | "My submissions" — list across all courses with status filter |
| `/submissions/[id]` | Detail view: files, score, comments, revision upload if REVISION_REQUESTED |

### 3.3 MENTOR / INSTRUCTOR / ADMIN

| Route | Purpose | Scope |
|---|---|---|
| `/review` | Queue view grouped by status tab (Submitted / Under Review / Approved / Revision) | MENTOR: own mentees only. INSTRUCTOR: assignments on own courses. ADMIN: all. |
| `/review/[submissionId]` | Reviewer UI: file preview + score/feedback form + comment thread | Same scope + `requireOwnStudent()` check for MENTOR |
| `/mentees` | MENTOR dashboard: list of paired STUDENTs + summary stats | MENTOR: own. ADMIN: all. |
| `/mentees/[studentId]` | Per-student drill-down: enrolled courses, progress, submissions, quiz scores | MENTOR: own. ADMIN: all. |

### 3.4 API

| Route | Method | Purpose |
|---|---|---|
| `/api/upload` | POST | multipart upload (existing) — `purpose: 'submission'` path |
| `/api/files/[...key]` | GET | presigned download. For keys under `submissions/{id}/`, caller must be: submission owner, paired mentor, author of the course, or ADMIN. |
| `/api/files/preview/[...key]` | GET | inline preview for PDF/images (returns `Content-Disposition: inline`) |

---

## 4. Acceptance Criteria

### 4.1 US-ASSIGN-CREATE (v3)

> As INSTRUCTOR/ADMIN, I attach an assignment to a lesson.

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | Assignment fields: `title`, `description` (MD), `maxFileSize` (MB), `allowedTypes` (MIME list), `dueDate` | 2.1.2(5) |
| 2 | Multiple assignments per lesson allowed | — |
| 3 | INSTRUCTOR cannot create an assignment on a course they don't author (ADMIN can) | 2.1.1(2) |
| 4 | Soft-delete: deleting an assignment with existing submissions is blocked unless `force=true` (ADMIN only) | — |

### 4.2 US-ASSIGN-SUBMIT

> As STUDENT, I upload file(s) as a submission.

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | Dropzone accepts multiple files; validates MIME against `allowedTypes`; rejects > `maxFileSize` client-side and server-side | 2.1.2(5) |
| 2 | Each file uploads with a progress bar | — |
| 3 | Files are stored at `submissions/{submissionId}/{uuid}.{ext}`; DB row `SubmissionFile` created per file | 2.1.2(5) |
| 4 | Clicking "Submit" transitions `DRAFT → SUBMITTED` and sets `firstSubmittedAt` if null | 2.1.2(5) |
| 5 | STUDENT cannot edit a submission once `SUBMITTED` (except to add comments) until it becomes `REVISION_REQUESTED` | — |
| 6 | On `REVISION_REQUESTED`, STUDENT can upload new files and click "Re-submit" → status `SUBMITTED`, `reviewCycle++` | 2.1.2(5) |

### 4.3 US-REVIEW-QUEUE

> As MENTOR, I see all pending submissions from my mentees.

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | Queue lists submissions where `status IN (SUBMITTED, UNDER_REVIEW)` | 2.1.3 ครู CAM(1)(2) |
| 2 | Default scope: MENTOR sees only submissions whose student's `mentorId = me`; ADMIN/INSTRUCTOR see all (with scope toggle) | 2.1.3 ครู CAM(1) |
| 3 | Click a row → claim review (sets `UNDER_REVIEW` + `reviewedBy = me`) | — |
| 4 | If another reviewer already holds the row for <10min, second reviewer sees a "locked" banner but can force-claim | — |

### 4.4 US-REVIEW-DECIDE

> As MENTOR, I preview the file(s), give a score + feedback, and approve or request revision.

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | File preview: PDFs + images render inline; others show filename + download link | 2.1.3 ครู CAM(2) |
| 2 | Score (numeric 0–100) + feedback text required on approval | 2.1.3 ครู CAM(2) |
| 3 | On "Approve" → status `APPROVED`; on "Request Revision" → status `REVISION_REQUESTED` | 2.1.2(5) |
| 4 | Both decisions record `reviewedBy`, `reviewedAt`, `score`, `feedback` | 2.1.3 ครู CAM(2) |
| 5 | Notification sent to STUDENT (in-app bell) with link to the submission | 2.1.3 ครู CAT(4) |
| 6 | MENTOR cannot review a submission whose STUDENT is not paired to them (403) | 2.1.3 ครู CAM(1) |

### 4.5 US-COMMENT-THREAD

> Both sides can leave threaded comments on a submission.

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | Comment list ordered chronologically with author name + role badge | 2.1.3 ครู CAM(2) |
| 2 | STUDENT can comment even when submission is `APPROVED` (so questions post-approval stay possible) | — |
| 3 | MENTOR/INSTRUCTOR/ADMIN can post `isInternal=true` comments hidden from the STUDENT | — |
| 4 | New comment triggers a notification to the *other* party (in-app) | 2.1.3 ครู CAT(4) |

### 4.6 US-MENTEE-PROGRESS

> As MENTOR, I see each mentee's progress and historical submissions.

| # | Criterion | TOR Ref |
|---|-----------|---------|
| 1 | `/mentees` lists assigned STUDENTs with: enrolled courses, completion %, pending submissions count | 2.1.3 ครู CAM(1) |
| 2 | `/mentees/[id]` drilldown: lesson-by-lesson progress + quiz attempts + submission history | 2.1.3 ครู CAM(3) |
| 3 | ADMIN and INSTRUCTOR use the same pages but with broader scope | — |

---

## 5. Server Actions

```ts
// app/teach/[courseId]/assignments/actions.ts  (INSTRUCTOR/ADMIN, ownership-gated)
createAssignment(lessonId, data)    updateAssignment(id, data)    deleteAssignment(id, { force })

// app/courses/[slug]/lessons/[id]/submit/actions.ts  (STUDENT)
startDraftSubmission(assignmentId)  // creates DRAFT if none
attachSubmissionFile(submissionId, uploadedFileMeta)  // after /api/upload returns key
removeSubmissionFile(fileId)        // only if status == DRAFT || REVISION_REQUESTED
submitSubmission(submissionId)      // DRAFT → SUBMITTED, firstSubmittedAt = now
resubmitSubmission(submissionId)    // REVISION_REQUESTED → SUBMITTED, reviewCycle++

// app/review/actions.ts  (MENTOR/INSTRUCTOR/ADMIN + ownership check)
claimReview(submissionId)           // SUBMITTED → UNDER_REVIEW
releaseReview(submissionId)         // UNDER_REVIEW → SUBMITTED (abandon)
approveSubmission(submissionId, score, feedback)
requestRevision(submissionId, score | null, feedback)
addComment(submissionId, content, { isInternal })
```

**Guards, repeated on every action:**
1. `requireRole(...)` — only the roles listed above.
2. For MENTOR: `requireOwnStudent(session.user.id, submission.studentId)`.
3. For INSTRUCTOR: `course.authorId === session.user.id` (through submission → assignment → lesson → course).
4. State transition validator — reject illegal transitions with a typed error.

---

## 6. File Preview & Access Control

### 6.1 Access rules for a submission file key `submissions/{id}/{uuid}.{ext}`

A request is authorized iff one of:
- Session user is `submission.studentId`
- Session user is the STUDENT's `mentorId`
- Session user is author of the course that owns the assignment
- Session user is ADMIN

`/api/files/[...key]` looks up the owning submission, runs the above check, then returns a presigned URL (10-min TTL).

### 6.2 Preview vs download

- `/api/files/preview/[...key]` sets `response-content-disposition=inline` in the presigned URL, so PDFs and images render in the browser.
- `/api/files/[...key]` omits that header, triggering download for any type.

### 6.3 Virus / MIME sanity

- Validate MIME on upload against `assignment.allowedTypes`.
- Reject files whose sniffed MIME (via magic bytes, `file-type` npm) disagrees with declared MIME — prevents a `.exe` with `application/pdf` header.

---

## 7. Notifications (in-app)

Add handlers that enqueue `Notification` rows on state transitions:

| Trigger | Target | `type` | Link |
|---|---|---|---|
| `SUBMITTED` | assigned MENTOR (if any) | `SUBMISSION_RECEIVED` | `/review/{id}` |
| `APPROVED` | STUDENT | `SUBMISSION_REVIEWED` | `/submissions/{id}` |
| `REVISION_REQUESTED` | STUDENT | `REVISION_REQUESTED` | `/submissions/{id}` |
| new comment (non-internal) | other party | `FEEDBACK_RECEIVED` | `/submissions/{id}` |

Bell icon in header polls `/api/notifications?unreadOnly=true` on route change; "Mark all read" endpoint is a simple UPDATE.

---

## 8. Tests

### 8.1 Unit

| File | What |
|---|---|
| `tests/unit/submission-status.test.ts` | (existing) — extend with `reviewCycle` increment and illegal-transition rejection |
| `tests/unit/upload-validation.test.ts` | (existing) — add magic-byte vs declared-MIME mismatch |
| `tests/unit/access-rules.test.ts` | NEW — `canAccessSubmissionFile(session, submission)` matrix |

### 8.2 Integration

| File | What |
|---|---|
| `tests/integration/submissions.test.ts` | (existing) — adapted to 4 roles |
| `tests/integration/review-queue.test.ts` | NEW — MENTOR A sees only own mentees; MENTOR B cannot claim A's |
| `tests/integration/notification-on-transition.test.ts` | NEW — state change writes exactly one Notification row per side |

### 8.3 E2E (Playwright)

| File | Flow |
|---|---|
| `tests/e2e/upload.spec.ts` | (existing) — updated selectors; end-to-end submit + re-submit |
| `tests/e2e/review-loop.spec.ts` | NEW — MENTOR approves; STUDENT sees score; STUDENT comments → MENTOR sees notification |
| `tests/e2e/review-rbac.spec.ts` | NEW — MENTOR B cannot open a submission owned by MENTOR A's mentee |

---

## 9. Deliverables Checklist

- [ ] Schema delta migrated (`firstSubmittedAt`, `reviewCycle`, `isInternal`)
- [ ] Assignment CRUD UI under `/teach`
- [ ] Submission upload UI + state transitions
- [ ] `/review` queue + `/review/[id]` detail
- [ ] `/mentees` dashboard + drill-down
- [ ] File preview endpoint
- [ ] Notification inserts on transitions
- [ ] Bell icon + `/api/notifications` + "Mark all read"
- [ ] All tests in §8 green
- [ ] UAT rehearsal with fake data (see Doc 5 §10 for fixture plan)

---

## 10. Phase-1 (TOR §2.1) Exit Criteria — End of Day 45

At the end of this phase, the following TOR clauses are **demonstrable** end-to-end:

- 2.1.1 user import + role perms ✅ (Phase 1)
- 2.1.2(1) course + lesson structure ✅ (Phase 2)
- 2.1.2(2) multimedia + downloads ✅ (Phase 2)
- 2.1.2(3) Pre/Post/Quiz auto-score ✅ (Phase 2)
- 2.1.2(4) real-time percent completion ✅ (Phase 2)
- 2.1.2(5) file upload + "แจ้งตรวจเสร็จ" workflow ✅ (**this phase**)
- 2.1.3 CAT/CAM/นักวิจัย capabilities, mapped to STUDENT/MENTOR/INSTRUCTOR/ADMIN ✅

**Deferred to Doc 5 (Phase 4 — §2.2, Day 90):**
- 2.1.2(6) certificate issuance
- 2.1.2(7) PDF generation
- 2.1.2(8) pass-rate summary
- 2.2.* evaluation, supervision video, leaderboard, export

---

## 11. Risks & Notes

- **Simultaneous reviewers** — the 10-min advisory lock on `reviewedBy` is optimistic, not a DB lock. Document the "force claim" UX so it doesn't look like a bug when a second reviewer sees the banner.
- **Orphaned MinIO objects** — if a DRAFT submission is abandoned, its files linger. Add a nightly cron job to garbage-collect MinIO objects with no DB reference older than 7 days. (Land in Doc 5 §8 alongside other ops cron jobs.)
- **Per-row access checks at scale** — `/review` queue must paginate + pre-filter by `studentId IN (paired mentees)` in the DB query, not in memory. Add an index on `User(mentorId)`.
- **Large PDF previews** — MinIO presigned URLs for PDFs render inline in Chrome but not all browsers. Provide a "Download" fallback alongside the preview.

---

**Prev ← [Doc 3: Content Pipeline](./mini-lms-v3-03-content-learning.md)**
**Next → [Doc 5: Evaluation, Reports & Delivery](./mini-lms-v3-05-evaluation-reporting-delivery.md)**
