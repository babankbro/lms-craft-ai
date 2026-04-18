# Plan: completion_review_notifications

## Status: PENDING

## Context — Gaps found in audit

All previous plans (admin panel, quiz linking, submission handling, course assignments) are complete. This plan addresses the next three functional gaps discovered in the codebase:

### Gap 1 — Reviewer cannot see student text answers
`/review/[id]/page.tsx` fetches `files` but NOT `answers` (SubmissionAnswer records). A mentor/instructor reviewing a TEXT or BOTH question sees nothing — only file uploads appear. `/submissions/[id]/page.tsx` (student's own view) has the same blind spot.

### Gap 2 — Certificate auto-check not wired to lesson completion
`maybeIssueCertificate` is called in `quiz-actions.ts` after a quiz is submitted. But `markLessonComplete` in `courses/actions.ts` does NOT call it. If a student completes the last lesson and has already passed all quizzes, no certificate is issued until they happen to submit another quiz.

### Gap 3 — No notification bell in the nav
Notifications are written to the DB from review actions, quiz submissions, certificate issuance, and enrollment events. The API route `/api/notifications` exists. But there is no persistent bell icon with unread count in the nav sidebar — users have no awareness of pending notifications.

---

## Dependency graph

```
T1 — Text answers in review detail
  └── app/review/[id]/page.tsx: add answers query + render per-question

T2 — Text answers in student submission detail
  └── app/submissions/[id]/page.tsx: same query + render (read-only, no form)

T3 — Certificate trigger on lesson complete
  └── app/courses/actions.ts: markLessonComplete → maybeIssueCertificate

T4 — Course completion CTA on course overview
  └── app/courses/[slug]/page.tsx: show "ขอรับเกียรติบัตร" button when isComplete
      lib/certificate.ts: maybeIssueCertificate already handles idempotency
      New server action: requestCertificate(courseId) in courses/actions.ts

T5 — Notification bell in nav
  └── components/shell/app-shell.tsx or sidebar: add NotificationBell component
      new component: components/shell/notification-bell.tsx (client, polls /api/notifications)
      app/api/notifications/route.ts: already exists (GET unread, POST mark-read)
```

T1 and T2 are independent. T3 is a one-line fix. T4 depends on T3 conceptually (same cert flow). T5 is independent.

---

## Vertical slices

### T1 — Text answers in the review page

**Problem:** Mentor opens `/review/5` to grade a text assignment. The page shows metadata, uploaded files, and a score form — but zero visibility into what the student actually wrote for each text question. The reviewer is grading blind.

**Files:**
- `app/review/[id]/page.tsx`

**Changes:**
1. Add `answers` and `questions` to the submission query:
   ```ts
   answers: {
     include: {
       question: { select: { prompt: true, order: true, responseType: true } },
       files: { select: { id: true, fileName: true, fileKey: true, fileSize: true } },
     },
     orderBy: { question: { order: "asc" } },
   }
   ```
2. Add an "คำตอบนักเรียน" Card between metadata and files card.
3. For each answer: show the question prompt, the text response (if any), and inline file links (if any).
4. Style: question prompt in `text-muted-foreground`, answer in `text-sm` with a `whitespace-pre-wrap` class to preserve newlines.

**Acceptance criteria:**
- Reviewer sees all question prompts in submission order
- Text answers are rendered with newlines preserved
- FILE-only answers show the file link (no "no text" placeholder)
- Questions with no answer yet show "ยังไม่ได้ตอบ" in muted style
- Files section still exists below for legacy/backward compat

**Unit test:** `tests/unit/review-answers-display.test.ts`
- Test answer sorting by question order
- Test empty-answer guard (renders placeholder not crash)

**Verify:** Visit `/review/[any-submitted-id]` as mentor → see filled answers

---

### T2 — Text answers in student submission detail

**Problem:** `/submissions/[id]` shows files, score, and comments — but not the student's own text answers. A student cannot review what they wrote after submitting.

**Files:**
- `app/submissions/[id]/page.tsx`

**Changes:**
1. Same query additions as T1 (answers + question).
2. Add "คำตอบของฉัน" Card above the files card.
3. For each question with an answer, show prompt and text (read-only).
4. No edit capability here — editing happens only via AssignmentPanel in DRAFT state.

**Acceptance criteria:**
- Student sees their own text answers per question
- Reviewer visiting the same page also sees answers
- Files section unchanged

**Verify:** student1 visits their submission detail → sees text they wrote in seed data

---

### T3 — Trigger certificate check on lesson completion

**Problem:** `markLessonComplete` marks a lesson done and revalidates. It does NOT check whether this was the last lesson and whether the student is now eligible for a certificate. The only auto-trigger is quiz submission. A student who finishes all lessons and has already passed all quizzes gets no certificate until some future quiz action fires.

**Files:**
- `app/courses/actions.ts`

**Changes:**
1. After the `upsert` in `markLessonComplete`, fetch the `lesson.courseId`.
2. Call `maybeIssueCertificate(user.id, lesson.courseId).catch(() => {})` — fire-and-forget so a cert failure never blocks lesson completion.

```ts
const lesson = await prisma.lesson.findUniqueOrThrow({
  where: { id: lessonId },
  select: { courseId: true },
});
maybeIssueCertificate(user.id, lesson.courseId).catch(() => {});
```

**Acceptance criteria:**
- After marking the last lesson complete, DB record `Certificate` is created (if all other gates pass)
- Non-last-lesson completion does not error (cert check runs, returns `isComplete: false`, no cert created)
- Fire-and-forget — slow S3 write does not delay page revalidation

**Unit test:** `tests/unit/certificate-trigger.test.ts`
- Test that `maybeIssueCertificate` returns `false` when lessons not all complete
- Test idempotency: second call for already-issued cert returns `false`, no duplicate
(These already exist in `tests/unit/certificate-eligibility.test.ts` — verify coverage is sufficient)

**Verify:** In dev, complete all lessons as student1 → certificate row appears in DB

---

### T4 — Course completion CTA on the course overview page

**Problem:** When a student has completed everything (all lessons, all quizzes, all section gates), there is no "Get Certificate" button or completion banner on `/courses/[slug]`. The certificate is issued automatically via T3/quiz-actions, but there is no visible acknowledgement or fallback "request certificate" action for the student.

**Files:**
- `app/courses/[slug]/page.tsx`
- `app/courses/actions.ts` (new: `requestCertificate` server action)

**Changes:**
1. In `courses/actions.ts`, add:
   ```ts
   export async function requestCertificate(courseId: number) {
     const user = await requireAuth();
     await maybeIssueCertificate(user.id, courseId);
     revalidatePath(`/courses`);
   }
   ```
2. In `courses/[slug]/page.tsx`, for approved enrolled students:
   - Call `checkCourseCompletion(user.id, course.id)` to get `isComplete`
   - Check for existing `Certificate` record
   - If `isComplete && !existingCert`: show "ขอรับเกียรติบัตร" form button (calls `requestCertificate`)
   - If `existingCert`: show "ได้รับเกียรติบัตรแล้ว" badge with download link
3. Place the CTA in the "Progress" section above the lesson list, after the progress bar.

**Acceptance criteria:**
- Student with all gates passed sees "ขอรับเกียรติบัตร" button
- Clicking it issues the certificate and refreshes to show "ได้รับเกียรติบัตรแล้ว" + download
- Student who already has the cert sees download link directly
- Incomplete students see nothing extra (no confusing partial-completion indicator)
- Staff (INSTRUCTOR/ADMIN/MENTOR) do not see the certificate CTA

**Unit test:** `tests/unit/certificate-cta-logic.test.ts`
- `shouldShowCTA(isComplete, hasCert, role)` returns true only for STUDENT + complete + no cert
- `shouldShowDownload(hasCert, role)` returns true for STUDENT + hasCert

**Verify:** Dev flow — student1 completes all lessons → cert CTA appears → click → cert created

---

### T5 — Notification bell in the nav sidebar

**Problem:** Notifications are written to DB (enrollment, submission reviewed, certificate issued, revision requested) but there is no persistent bell icon in the sidebar. Users never see them unless they happen to visit the dashboard.

**Files:**
- `components/shell/notification-bell.tsx` (new client component)
- `components/shell/app-shell.tsx` (add bell to header bar)
- `app/api/notifications/route.ts` (already exists — verify mark-all-read endpoint)

**Changes:**

1. New `NotificationBell` client component:
   - Polls `/api/notifications` on mount (no interval — just on mount + after click)
   - Shows a `Bell` icon with a red dot badge when `unread > 0`
   - On click: opens a dropdown list of the latest 10 notifications (title + message + link + time)
   - Each item is a `Link` to the notification's `link` field
   - "อ่านทั้งหมด" button at bottom → calls `POST /api/notifications` to mark all read

2. Schema of notification items rendered:
   ```
   [icon based on type] [title] [relative time]
                        [message truncated to 80 chars]
   ```
   Types → icons:
   - `SUBMISSION_RECEIVED` → Inbox
   - `SUBMISSION_REVIEWED` → CheckCircle2
   - `REVISION_REQUESTED` → AlertTriangle
   - `CERTIFICATE_ISSUED` → Award
   - `ENROLLMENT_APPROVED` → UserCheck
   - `ENROLLMENT_REJECTED` → UserX
   - Default → Bell

3. Add `NotificationBell` to the header bar in `app-shell.tsx` (top-right of the top bar).

**Acceptance criteria:**
- Bell shows with red badge when unread notifications exist
- Clicking opens dropdown; clicking a notification navigates to its link
- "อ่านทั้งหมด" marks all as read and removes the badge
- Works for all roles (STUDENT, MENTOR, INSTRUCTOR, ADMIN)
- No polling interval — only re-fetches on mount and on bell click (no background drain)

**Unit test:** `tests/unit/notification-bell-logic.test.ts`
- `getNotificationIcon(type)` returns expected icon name
- `formatRelativeTime(createdAt)` returns "เมื่อกี้" for < 1 min, "Xนาที" etc.
- `filterUnread(notifications)` returns only isRead=false items

**Verify:** Approve a student enrollment → bell shows badge → click → see "enrollment approved" → mark read → badge gone

---

## Checkpoints

| After | Gate |
|-------|------|
| T1 | Reviewer sees per-question text answers; no regression on file display |
| T2 | Student sees their own answers on submission detail |
| T3 | `markLessonComplete` triggers cert check; no performance regression |
| T4 | Course overview shows cert CTA when eligible; cert issues on click |
| T5 | Bell shows unread count; dropdown renders; mark-read clears badge |

## Dependency order

T1 → T2 (same pattern, do together)
T3 → T4 (T4 reuses the cert check logic made reliable by T3)
T5 (independent)

Recommended build order: T1, T2, T3, T4, T5
