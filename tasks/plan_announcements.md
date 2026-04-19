# Plan: Course Announcements

## Status: PENDING

## Goal
Instructors post announcements to all enrolled students of a course. Students see announcements on the course overview page. Published announcements trigger in-app notifications for enrolled students.

## Context

- No `CourseAnnouncement` model in schema
- `NotificationType` needs `COURSE_ANNOUNCEMENT`
- Display location: course overview page (`/courses/[slug]`) — near the top, collapsible if many
- Instructor writes via teach workbench

## Dependency Graph

```
Schema: CourseAnnouncement
  └── T1 — migration

Announcement CRUD actions (instructor)
  └── T2 — teach/[courseId]/announcements/actions.ts
              └── createAnnouncement / publishAnnouncement / deleteAnnouncement

Instructor announcement management page
  └── T3 — app/teach/[courseId]/announcements/page.tsx
              └── list with draft/published toggle
              └── link from workbench

Student-facing announcement feed
  └── T4 — CourseAnnouncementFeed component
              └── wire into /courses/[slug] page (top, collapsible)

Notification broadcast
  └── T5 — on publishAnnouncement: batch-create Notification for all APPROVED enrollments
```

## Vertical Slices

### T1 — Schema

```prisma
model CourseAnnouncement {
  id          Int      @id @default(autoincrement())
  courseId    Int      @map("course_id")
  authorId    String   @map("author_id")
  title       String
  body        String   @db.Text
  isPublished Boolean  @default(false) @map("is_published")
  publishedAt DateTime? @map("published_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  author User   @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([courseId, isPublished])
  @@map("course_announcements")
}
```

- Add `COURSE_ANNOUNCEMENT` to `NotificationType` enum
- Add `announcements CourseAnnouncement[]` relation to `Course` and `User`
- Run `prisma migrate dev --name add_course_announcements`
- **AC:** Table created; relations resolve

### T2 — Server actions
- `app/teach/[courseId]/announcements/actions.ts`:
  - `createAnnouncement(courseId, title, body)` — creates draft
  - `updateAnnouncement(id, title, body)` — INSTRUCTOR/ADMIN + own course
  - `publishAnnouncement(id)` — sets `isPublished=true`, `publishedAt=now()`; triggers T5 notification batch
  - `unpublishAnnouncement(id)` — sets `isPublished=false`
  - `deleteAnnouncement(id)` — deletes row; can only delete own + course
- **AC:** Non-owner instructor cannot modify another instructor's course announcements

### T3 — Instructor management page
- `app/teach/[courseId]/announcements/page.tsx` — lists all announcements, draft + published
- Create form at top (title + body textarea)
- Per-row actions: Edit (inline or modal) / Publish / Delete
- Add "ประกาศ" link card to workbench bottom section
- **AC:** Creating a draft does not notify students; publishing does

### T4 — Student-facing feed
- `app/courses/[slug]/_components/course-announcement-feed.tsx` (server component)
- Fetches latest 3 published announcements for the course
- Shows: title + formatted date + body (collapsed after 3 lines with "อ่านเพิ่มเติม")
- "ดูทั้งหมด" link if more than 3
- Rendered at top of course overview (below enrollment status, above score breakdown)
- Only shown when `canViewAsEnrolled`
- **AC:** Students see published announcements; drafts not visible to students

### T5 — Notification broadcast
- In `publishAnnouncement` action: find all APPROVED enrollments for the course, batch-insert `Notification` rows (type `COURSE_ANNOUNCEMENT`, link to `/courses/[slug]`)
- Use `prisma.notification.createMany` for efficiency
- **AC:** After publish, all enrolled students have a new unread notification

## Checkpoints

| After | Gate |
|-------|------|
| T1 | Schema migrated |
| T2 | CRUD actions enforce ownership |
| T3 | Instructor can create, edit, publish, delete from workbench |
| T4 | Students see published announcements on course overview |
| T5 | Notification batch fires on publish |
