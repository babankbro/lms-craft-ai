# Mini LMS v3 — Doc 2/5: Phase 1 — Foundation, Auth & RBAC

> **Phase window:** Week 1 – Week 2 (≈ Days 1–14)
> **Payment tranche:** Part of §2.1 (70%)
> **Prereq:** v2 codebase builds & tests green on `main`.
> **Last doc↔code sync:** 2026-04-17

---

## 0. As-Built Status (doc↔code drift)

Phase 1 is largely shipped. Differences between this design doc and `mini-lms/`:

| # | Design says | Code has | Notes |
|---|---|---|---|
| 1 | `prisma/migrations/20260420_v3_role_refactor/migration.sql` (§2.4) | `prisma/migrations/` directory is **empty** | The v3 schema lives in `prisma/schema.prisma` but no versioned migration was committed. Dev DBs are bootstrapped via `prisma migrate dev`/`db push` ad-hoc. Production migration plan is still to be written. |
| 2 | Migration SQL references `"User"`, `"Course"` etc. (PascalCase, §2.4) | Prisma `@@map` emits snake_case tables: `users`, `courses`, `evaluation_rounds`, `submission_comments`, … | If the migration in §2.4 is ever run verbatim it will fail. Rewrite with quoted snake_case names before applying. |
| 3 | `requireOwnStudent(mentorId, studentId)` throws 403 (§3.2) | Function is a `TODO` stub in `lib/permissions.ts:51-53` — body is empty, never rejects | Every MENTOR route guard that depends on this check is effectively a no-op. **Known security gap.** Needed for Doc 4 `/review` scoping. |
| 4 | Middleware matcher: `["/((?!api/auth\|login\|register\|_next\|favicon).*)"]` (§3.3) | Explicit prefix list: `/dashboard`, `/courses`, `/teach`, `/admin`, `/review`, `/submissions`, `/mentees`, `/observe`, `/evaluation`, `/evaluations`, `/supervision`, `/certificates`, `/reports`, `/notifications` | Functionally equivalent for the routes that exist. Any *future* authenticated route must be added to the matcher explicitly. |
| 5 | Middleware body guards `/observe` (absent in §3.3 example) | `/observe` is explicitly gated to MENTOR / INSTRUCTOR / ADMIN in `middleware.ts:28` | Code is stricter than the doc example. |
| 6 | Admin UI is multi-page: `/admin/users/new`, `/admin/users/[id]`, `/admin/users/import`, `/admin/pairings` (§4.1) | Single page `app/admin/users/page.tsx` hosts create form, CSV import, **and** pairings inline | No `/new`, `/[id]`, `/import`, or `/pairings` routes exist. Server actions in `app/admin/users/actions.ts` handle all flows. |
| 7 | CSV importer accepts both `school_name` and `group_name` headers with deprecation warning (§4.2) | Importer accepts the v3 header only (no dual-header fallback) | Old-header CSVs fail with a row-level error. Acceptable since pre-v3 data was migrated, not re-imported. |
| 8 | Seed: 1 ADMIN, 1 INSTRUCTOR, 2 MENTORs, 10 STUDENTs (§8) | See `prisma/seed.ts` — verify counts match before UAT | Not re-read here; check before Day 80 UAT. |

`UserRole` enum in schema has an extra `STUDENT` default (`role UserRole @default(STUDENT)`) — matches §2.2.

---

## 1. Scope

This phase is a **zero-feature refactor**: no new capability is added for end-users. We rename roles, migrate data, and tighten RBAC. Every v2 feature still works at the end of this phase, just with new role labels and new guards.

### 1.1 In Scope

- Prisma enum migration: `CAT|CAM|RESEARCHER` → `STUDENT|MENTOR|INSTRUCTOR|ADMIN`
- User model column rename `schoolName` → `groupName`
- Backfill script for existing rows
- NextAuth session: update JWT `role` claim + type definitions
- `lib/permissions.ts` rewrite with per-role helpers
- `middleware.ts` route-group gating for 4 roles
- Admin UI: users list, create user, edit role, activate/deactivate
- Admin UI: CSV import (already exists — only column header check)
- Admin UI: STUDENT ↔ MENTOR pairing page (renamed from CAT↔CAM)
- Seed script + unit tests for role helpers

### 1.2 Out of Scope (this phase)

- Course / Lesson / Quiz changes — Doc 3
- Assignment / Submission changes — Doc 4
- Evaluation / Certificate / Reports — Doc 5
- Email notifications
- Instructor course-authoring UI (schema additions land this phase, UI lands Doc 3)

---

## 2. Schema Changes

### 2.1 Enum rename

```prisma
// prisma/schema.prisma

enum UserRole {
  STUDENT
  MENTOR
  INSTRUCTOR
  ADMIN
}
```

### 2.2 User model

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String
  fullName        String
  role            UserRole  @default(STUDENT)
  groupName       String?                                // renamed from schoolName
  isActive        Boolean   @default(true)

  mentorId        String?
  mentor          User?     @relation("Mentorship", fields: [mentorId], references: [id], onDelete: SetNull)
  mentees         User[]    @relation("Mentorship")

  // NEW — for Doc 3 (course authoring by INSTRUCTOR)
  authoredCourses Course[]  @relation("CourseAuthor")

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // existing back-relations (enrollments, submissions, etc.) are unchanged
  ...
}
```

### 2.3 Course model — additive fields (used in Doc 3)

```prisma
model Course {
  ...
  coverImageKey String?
  category      String?
  level         CourseLevel?
  authorId      String?
  author        User? @relation("CourseAuthor", fields: [authorId], references: [id], onDelete: SetNull)
}

enum CourseLevel { BEGINNER INTERMEDIATE ADVANCED }
```

Columns are nullable so existing rows migrate without default backfill. The author UI lands in Doc 3.

### 2.4 Migration SQL (generated + hand-edited)

Prisma's default enum rename is destructive. We write a manual migration:

```sql
-- prisma/migrations/20260420_v3_role_refactor/migration.sql
BEGIN;

-- 1. Add new enum
CREATE TYPE "UserRole_new" AS ENUM ('STUDENT', 'MENTOR', 'INSTRUCTOR', 'ADMIN');

-- 2. Convert column with mapping
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE "role"::text
      WHEN 'CAT'        THEN 'STUDENT'::"UserRole_new"
      WHEN 'CAM'        THEN 'MENTOR'::"UserRole_new"
      WHEN 'RESEARCHER' THEN 'ADMIN'::"UserRole_new"
    END
  );

-- 3. Swap enum names
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- 4. Rename column
ALTER TABLE "User" RENAME COLUMN "schoolName" TO "groupName";

-- 5. Additive fields for Course (used by later docs)
ALTER TABLE "Course"
  ADD COLUMN "coverImageKey" TEXT,
  ADD COLUMN "category"      TEXT,
  ADD COLUMN "level"         TEXT,        -- constrained by enum below
  ADD COLUMN "authorId"      TEXT;

CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
ALTER TABLE "Course"
  ALTER COLUMN "level" TYPE "CourseLevel" USING "level"::"CourseLevel";

ALTER TABLE "Course"
  ADD CONSTRAINT "Course_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL;

COMMIT;
```

### 2.5 Post-migration manual step (one-off)

Admins review the users who were `RESEARCHER`→`ADMIN` and demote content-only staff to `INSTRUCTOR`. Document this in `README.md` under "After deploying v3".

---

## 3. TypeScript & NextAuth updates

### 3.1 Session type

```ts
// types/next-auth.d.ts
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; name: string; role: UserRole };
  }
}
declare module "next-auth/jwt" {
  interface JWT { id: string; role: UserRole; }
}
```

### 3.2 Permission helpers

```ts
// lib/permissions.ts
import type { UserRole } from "@prisma/client";

export const ROLE = { STUDENT: "STUDENT", MENTOR: "MENTOR", INSTRUCTOR: "INSTRUCTOR", ADMIN: "ADMIN" } as const satisfies Record<UserRole, UserRole>;

export const canReview   = (r: UserRole) => r === "MENTOR" || r === "INSTRUCTOR" || r === "ADMIN";
export const canAuthor   = (r: UserRole) => r === "INSTRUCTOR" || r === "ADMIN";
export const canManage   = (r: UserRole) => r === "ADMIN";
export const canLearn    = (r: UserRole) => true; // all roles may enroll/watch; UI decides visibility

export async function requireAuth(): Promise<Session> { /* throw 401 if no session */ }
export async function requireRole(...allowed: UserRole[]): Promise<Session> { /* 403 if role mismatch */ }
export async function requireOwnStudent(mentorId: string, studentId: string): Promise<void> {
  // Throws 403 if `studentId`'s mentorId !== `mentorId` (unless caller is ADMIN)
}
```

### 3.3 Middleware

```ts
// middleware.ts
export default withAuth((req) => {
  const role = req.nextauth.token?.role;
  const path = req.nextUrl.pathname;

  if (path.startsWith("/admin") && role !== "ADMIN")
    return NextResponse.redirect(new URL("/dashboard", req.url));

  if (path.startsWith("/teach") && !["INSTRUCTOR","ADMIN"].includes(role))
    return NextResponse.redirect(new URL("/dashboard", req.url));

  if (path.startsWith("/review") && !["MENTOR","INSTRUCTOR","ADMIN"].includes(role))
    return NextResponse.redirect(new URL("/dashboard", req.url));

  if (path.startsWith("/mentees") && !["MENTOR","ADMIN"].includes(role))
    return NextResponse.redirect(new URL("/dashboard", req.url));
});

export const config = {
  matcher: ["/((?!api/auth|login|register|_next|favicon).*)"],
};
```

---

## 4. Admin UI

### 4.1 Pages

| Route | Purpose | Role |
|---|---|---|
| `/admin/users` | Paginated table: email, name, role, group, active, mentor | ADMIN |
| `/admin/users/new` | Single-user create form | ADMIN |
| `/admin/users/[id]` | Edit: change role (dropdown), activate/deactivate, reset password | ADMIN |
| `/admin/users/import` | CSV upload (existing) — header must be `email,full_name,role,group_name` | ADMIN |
| `/admin/pairings` | Two-pane UI: left = unpaired STUDENTs, right = MENTORs with mentee counts. Drag/assign. | ADMIN |

### 4.2 CSV Import — header change

Old v2 header: `email,full_name,role,school_name`
v3 header: `email,full_name,role,group_name`

The importer accepts **both** headers for one release (migration convenience), logs a deprecation warning on the old header.

Valid `role` values in CSV: `STUDENT`, `MENTOR`, `INSTRUCTOR`, `ADMIN` (case-insensitive). Reject unknown values with a per-row error in the import report.

### 4.3 Pairings UI — user stories

**US-PAIR-01** — ADMIN sees all STUDENT users and all MENTOR users with current assignments.
**US-PAIR-02** — ADMIN assigns one STUDENT to one MENTOR (one-to-many enforced).
**US-PAIR-03** — ADMIN unassigns a STUDENT (sets `mentorId = null`).
**US-PAIR-04** — Inactive users are greyed out and not selectable.
**US-PAIR-05** — Change takes effect on next request (no cache).

Acceptance: TOR 2.1.3 นักวิจัย(3) one-to-many constraint preserved.

---

## 5. Server Actions

```ts
// app/admin/users/actions.ts
export async function createUser(fd: FormData)        { /* ADMIN only */ }
export async function updateUserRole(id, role)        { /* ADMIN only */ }
export async function setUserActive(id, active)       { /* ADMIN only */ }
export async function resetUserPassword(id)           { /* ADMIN only; returns temp pw */ }
export async function assignMentor(studentId, mentorId) { /* ADMIN only */ }
export async function unassignMentor(studentId)       { /* ADMIN only */ }
```

Every action:
1. `await requireRole("ADMIN")`
2. Validate input with zod
3. Write, then `revalidatePath("/admin/users")`

---

## 6. Acceptance Criteria

| # | Criterion | TOR Ref |
|---|-----------|---------|
| F1-01 | After migration, every user has a role in `{STUDENT, MENTOR, INSTRUCTOR, ADMIN}` — no NULLs, no orphan values. | 2.1.1(2) |
| F1-02 | All v2 tests pass after role-identifier find/replace. | — |
| F1-03 | Login with an existing v2 credential works unchanged. | 2.1.1(2) |
| F1-04 | Attempting `/admin/*` as a non-ADMIN redirects to `/dashboard`. | 2.1.1(2) |
| F1-05 | A MENTOR can log in, but cannot open `/teach/*` or `/admin/*`. | 2.1.1(2) |
| F1-06 | An INSTRUCTOR can open `/teach/*` but cannot open `/admin/users`. | 2.1.1(2) |
| F1-07 | CSV import with `group_name` column succeeds; with `school_name` succeeds with deprecation warning. | 2.1.1(1) |
| F1-08 | Pairings page creates/updates/deletes mentorship rows atomically. | 2.1.3 (นักวิจัย 3) |
| F1-09 | Session JWT contains `role`; decoding with an expired token fails (401). | 3.2 |
| F1-10 | `groupName` is returned wherever `schoolName` was previously returned. | — |

---

## 7. Tests

### 7.1 Unit (Vitest)

| Test file | What |
|---|---|
| `tests/unit/permissions.test.ts` | `canReview`, `canAuthor`, `canManage` tables (4 roles × 3 helpers) |
| `tests/unit/csv-import.test.ts` | Old + new header formats; mixed-case roles; invalid role row-level error |
| `tests/unit/role-migration.test.ts` | Given a mock DB with CAT/CAM/RESEARCHER rows, assert mapped values post-migration |

### 7.2 Integration (Vitest + Prisma test DB)

| Test file | What |
|---|---|
| `tests/integration/user-admin.test.ts` | createUser → updateRole → setInactive → list excludes inactive |
| `tests/integration/pairing.test.ts` | Assigning a MENTOR to an already-paired STUDENT replaces (not duplicates) |

### 7.3 E2E (Playwright)

| Test file | Flow |
|---|---|
| `tests/e2e/admin-users.spec.ts` | ADMIN logs in → creates STUDENT → assigns MENTOR → STUDENT logs in & sees no admin links |
| `tests/e2e/rbac-redirects.spec.ts` | STUDENT visits `/admin` → lands on `/dashboard` |

---

## 8. Deliverables Checklist

- [ ] `prisma/migrations/20260420_v3_role_refactor/` — migration SQL
- [ ] `prisma/schema.prisma` — updated
- [ ] `lib/permissions.ts` — rewritten for 4 roles
- [ ] `middleware.ts` — 4-role gating
- [ ] `types/next-auth.d.ts` — updated
- [ ] `app/admin/users/` — full CRUD UI
- [ ] `app/admin/pairings/` — assignment UI
- [ ] `scripts/seed.ts` — seeds 1 ADMIN, 1 INSTRUCTOR, 2 MENTORs, 10 STUDENTs
- [ ] `README.md` — migration notes ("After deploying v3" section)
- [ ] All tests in §7 green

---

## 9. Risks & Notes

- **Do the enum migration during a maintenance window.** Prisma disables concurrent writes while the enum swap runs. On a ~1000-row user table the window is well under a second; still, schedule it.
- **Admin-only manual step** (demoting RESEARCHER→INSTRUCTOR) must be logged. Add a one-time banner on `/admin/users` until all RESEARCHER-originated users have been reviewed (flag: an `isReviewed` boolean on User, dropped after phase complete).
- **Legacy role names in URLs** — no route exposed `/cat/` or `/cam/`, so there's no URL redirect work. Good.

---

**Prev ← [Doc 1: Overview & Architecture](./mini-lms-v3-01-overview-architecture.md)**
**Next → [Doc 3: Course, Lesson & Quiz (Content Pipeline)](./mini-lms-v3-03-content-learning.md)**
