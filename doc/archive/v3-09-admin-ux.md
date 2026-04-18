# Mini LMS v3 — Doc 09: Admin UX (Users & Enrollment Approval)

## Overview

This document covers the redesign of the admin user-management page and enrollment-approval page, fixing the Server Component event-handler error and adding full management capabilities.

---

## E-1 · Root Cause Fix — `onValueChange` in Server Component

**Error:** `Event handlers cannot be passed to Client Component props` on `/admin/users`

**Cause:** The original `app/admin/users/page.tsx` (a Server Component) used shadcn `<Select onValueChange={…}>` to trigger `assignMentor`. Event handler props cannot cross the Server→Client boundary.

**Fix:** Extracted two `"use client"` components:

| Component | File | Purpose |
|-----------|------|---------|
| `MentorSelect` | `app/admin/users/_components/mentor-select.tsx` | Native `<select onChange>` to call `assignMentor(studentId, value)` |
| `RoleSelect` | `app/admin/users/_components/role-select.tsx` | Native `<select onChange>` to call `changeUserRole(userId, role)` |

Both use `async onChange` calling server actions directly (Next.js 15 allows calling server actions from Client Components).

---

## E-2 · `/admin/users` Redesign

**URL:** `/admin/users?q=&role=`

### Features

1. **Stats bar** — 4 cards showing count by role (Admin / Instructor / Mentor / Student) with icons
2. **Add user form + CSV import** — side-by-side 2-column layout; uses native `<select>` for role (no shadcn Select)
3. **User list table** — searchable by name/email (`?q=`), filterable by role (`?role=`), columns:
   - Name · Email · Role (RoleSelect dropdown) · Group · Active badge · Mentor assignment (MentorSelect for students) · Activate/Suspend toggle
4. **Unassigned students panel** — shows only students without a mentor for quick pairing

### New Server Actions (`app/admin/users/actions.ts`)

```ts
toggleUserActive(userId: string)     // flip isActive
changeUserRole(userId: string, role: string)  // update role
```

---

## E-3 · `/admin/enrollments` Redesign

**URL:** `/admin/enrollments?status=PENDING&courseId=`

### Features

1. **Tab counts** — each status tab (รอดำเนินการ / อนุมัติแล้ว / ปฏิเสธแล้ว / ยกเลิก) shows live count via `$queryRaw`
2. **Course filter** — `<select>` dropdown to filter by course, persists across tab navigation
3. **PENDING rows** — Approve button + reject with reason input
4. **APPROVED rows** — Revoke button (calls `revokeEnrollment`)
5. **REJECTED rows** — Shows `rejectReason` text below badge

### Data Flow

```
Admin clicks "อนุมัติ"
  → approveEnrollment(enrollmentId)        [app/teach/[courseId]/enrollments/actions.ts]
  → enrollment.status = APPROVED
  → notification sent to student (ENROLLMENT_APPROVED)
  → revalidatePath("/admin/enrollments")

Admin clicks "ถอนสิทธิ์"
  → revokeEnrollment(enrollmentId)
  → enrollment.status = CANCELLED
  → revalidatePath
```

---

## E-4 · Admin Sidebar

`app/admin/layout.tsx` updated with full nav:

```
👤 จัดการผู้ใช้          /admin/users
📋 คำขอลงทะเบียน        /admin/enrollments
📚 หลักสูตร              /admin/courses
🤝 จับคู่พี่เลี้ยง        /admin/pairings
📊 ประเมินผล             /admin/evaluations
← กลับแดชบอร์ด          /dashboard
```

---

## File Map

```
app/admin/
├── layout.tsx                              ← Updated (full nav)
├── users/
│   ├── page.tsx                            ← Rewritten (stats, search, toggle, RoleSelect)
│   ├── actions.ts                          ← +toggleUserActive, +changeUserRole
│   └── _components/
│       ├── mentor-select.tsx               ← NEW (Client Component)
│       └── role-select.tsx                 ← NEW (Client Component)
└── enrollments/
    └── page.tsx                            ← Enhanced (counts, course filter, revoke, reject reason)
```

---

## Build Status

`npx next build` — ✅ exit 0, no type errors
