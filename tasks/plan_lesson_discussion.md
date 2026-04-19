# Plan: Lesson Q&A (Discussion)

## Status: PENDING

## Goal
Students can post questions on any lesson; instructors/mentors/other students can reply. Each thread is visible to all enrolled users and course staff.

## Context

- No `LessonDiscussion` or `DiscussionReply` model in schema
- Lesson page: `app/courses/[slug]/lessons/[lessonId]/page.tsx`
- Notifications: `NotificationType` enum needs `DISCUSSION_REPLY`; instructor should be notified on new question
- Keep simple: flat replies (no nested threads), no upvotes, no markdown in first version

## Dependency Graph

```
Schema: LessonDiscussion + DiscussionReply
  └── T1 — migration

Discussion actions
  └── T2 — postQuestion / postReply / deleteDiscussion server actions

Discussion panel component
  └── T3 — DiscussionPanel server component
              └── lists questions + replies
              └── post-question form (enrolled students + staff)
              └── reply form (enrolled + staff)
  └── T4 — wire into lesson page below lesson content

Notifications
  └── T5 — createNotification for DISCUSSION_REPLY on new question (to instructor)
```

## Vertical Slices

### T1 — Schema

```prisma
model LessonDiscussion {
  id        Int      @id @default(autoincrement())
  lessonId  Int      @map("lesson_id")
  authorId  String   @map("author_id")
  body      String   @db.Text
  isResolved Boolean @default(false) @map("is_resolved")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  lesson  Lesson            @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  author  User              @relation(fields: [authorId], references: [id], onDelete: Cascade)
  replies DiscussionReply[]

  @@index([lessonId])
  @@map("lesson_discussions")
}

model DiscussionReply {
  id           Int      @id @default(autoincrement())
  discussionId Int      @map("discussion_id")
  authorId     String   @map("author_id")
  body         String   @db.Text
  createdAt    DateTime @default(now()) @map("created_at")

  discussion LessonDiscussion @relation(fields: [discussionId], references: [id], onDelete: Cascade)
  author     User             @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@map("discussion_replies")
}
```

- Add `discussions LessonDiscussion[]` to `Lesson` and `User`
- Add `DISCUSSION_QUESTION` to `NotificationType` enum
- Run `prisma migrate dev --name add_lesson_discussion`
- **AC:** Tables created; relations resolve

### T2 — Server actions
- `app/courses/[slug]/lessons/[lessonId]/discussion/actions.ts`:
  - `postQuestion(lessonId, body)` — creates `LessonDiscussion`; notifies course instructor
  - `postReply(discussionId, body)` — creates `DiscussionReply`; notifies question author if replier ≠ author
  - `deleteDiscussion(id)` — ADMIN/INSTRUCTOR/own question only
  - `markResolved(id)` — question author or instructor; sets `isResolved = true`
- Unit tests in `tests/unit/discussion-logic.test.ts`: body trimming, empty-body rejection
- **AC:** Actions enforce enrollment/staff access; notify on post

### T3 — DiscussionPanel component
- `app/courses/[slug]/lessons/[lessonId]/_components/discussion-panel.tsx` (server component)
- Shows questions ordered by `createdAt desc`
- Each question: author name + avatar initial + timestamp + body + resolved badge
- Replies indented below question
- Post-question textarea + submit (enrolled + staff only; hidden for unenrolled)
- Reply textarea per question (same access rule)
- "แก้ไขแล้ว" toggle for instructor / question author
- **AC:** Unenrolled visitor sees "ต้องลงทะเบียนเพื่อถามคำถาม"; enrolled sees form; resolved questions show badge

### T4 — Wire into lesson page
- Import and render `<DiscussionPanel lessonId={lesson.id} courseSlug={slug} />` at bottom of `app/courses/[slug]/lessons/[lessonId]/page.tsx`
- Only shown when `canViewAsEnrolled` (enrolled student or staff)
- **AC:** Discussion section visible after lesson content; hidden for unenrolled visitors

### T5 — Instructor notification
- When `postQuestion` is called, create `Notification` for course `authorId` with type `DISCUSSION_QUESTION`, link to lesson
- **AC:** Instructor's bell shows new notification after student posts a question

## Checkpoints

| After | Gate |
|-------|------|
| T1 | Schema migrated; models resolve |
| T2 | Actions enforce auth; notifications created |
| T3 | UI renders questions + replies correctly; forms work |
| T4 | Panel appears on lesson page for enrolled users |
| T5 | Instructor notified on new question |
