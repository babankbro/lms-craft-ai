# Mini LMS v3 — Doc 1/5: Overview & System Architecture

> **Version:** 3.0 | **Date:** 2026-04-17 | **Last doc↔code sync:** 2026-04-17
> **Scope:** Generalize v2 (teacher-training-specific) into a reusable LMS with STUDENT / MENTOR / INSTRUCTOR / ADMIN roles.
> **Source of truth for roles/data model/architecture. Phases 1–4 live in docs 2–5.**

---

## 0. As-Built Status (doc↔code drift)

This document represents the v3 **design intent**. The repository has shipped Phases 1–3 and most of Phase 4. The following v3 design elements differ from what is currently in `mini-lms/`:

| # | Design says | Code has | Notes |
|---|---|---|---|
| 1 | `Course.id: String @id @default(cuid())` (§3.3) | `Course.id: Int @id @default(autoincrement())` | Course / Lesson / Enrollment / etc. inherited v2's int IDs — not migrated to cuid. ObservationVideo and ObservationScore use cuid correctly. |
| 2 | `SupervisionVideo` **renamed** to `ObservationVideo` (§3.4) | Both models coexist | `SupervisionVideo` was kept as-is; `ObservationVideo` + `ObservationScore` were **added alongside**. Rename migration was not run. |
| 3 | `NotificationType` gains `ASSIGNMENT_DUE_SOON`, `NEW_COURSE_AVAILABLE` (§3.4) | Enum is `SUBMISSION_RECEIVED, SUBMISSION_REVIEWED, FEEDBACK_RECEIVED, REVISION_REQUESTED, CERTIFICATE_ISSUED` | The two design-intent values were never added. `REVISION_REQUESTED` and `SUBMISSION_RECEIVED` **were** added for Doc 4's review-loop notifications. |
| 4 | App Router uses route groups `(auth)` `(student)` `(mentor)` `(instructor)` (§4.1) | Flat routes: `app/login`, `app/dashboard`, `app/courses`, `app/review`, `app/mentees`, `app/observe`, `app/teach`, `app/admin` | No parenthesized route groups exist on disk. The role-gating happens in `middleware.ts` + per-page server guards. |
| 5 | `/register` route for self-signup (§4.1) | Not implemented | Users are created via `/admin/users` or CSV import only. |
| 6 | Student-facing `/quizzes/` and `/certs/` aliases (§4.1) | `/courses/[slug]/quiz/[quizId]` and `/certificates` | No standalone `/quizzes` index; no `/certs` alias. |
| 7 | PDF generation via `@react-pdf/renderer` (§5) | Hand-rolled PDF bytes in `lib/certificate.ts` (raw `%PDF-1.4` Helvetica) | No `@react-pdf/renderer` or `jsPDF` dependency. Output is minimal single-page A4 landscape. Good enough for TOR; swap is a later improvement. |
| 8 | Presigned URL TTL: **10 min** (§4.3) | **15 min** (`expiresIn: 900` in `app/api/files/[...key]/route.ts`) | Cosmetic divergence; security posture is equivalent. |
| 9 | `/api/files/[...key]` enforces per-resource RBAC (§4.3, Doc 4 §6.1) | Only enforces enrollment check for `lessons/{id}/…`; other prefixes fall through to a presigned redirect | Per-submission ownership check is **not** implemented. Treat this as a known gap for Phase 4 hardening. |
| 10 | MinIO bucket has a `public/covers/…` anonymous-read prefix (§4.3) | Bucket sets `anonymous download` on `public` prefix in `docker-compose.yml`, but `Course.coverImageKey` stores an arbitrary key — no enforcement that covers live under `public/covers/` | Convention, not schema-enforced. |
| 11 | Tech stack "Next.js 15" (§5) | ✅ `next@^15.1.0`, `@prisma/client@^6.5.0`, `next-auth@^4.24.11` in `package.json` | Matches. |

Use this table when reading §3 and §4 — treat the diff as the "spec delta still to land" rather than a contradiction.

---

## 1. Goals of the v3 Refactor

| # | Goal | Why |
|---|------|-----|
| G1 | Unify `CAT` (trainee) + `CAM` (mentor-as-learner) into a single `STUDENT` role | Both are "learners" in LMS terms; having two learner roles added complexity without value |
| G2 | Introduce `MENTOR` as the reviewer role (replaces `CAM`'s review duties) | A "mentor who reviews student work" is the canonical LMS reviewer pattern |
| G3 | Split `RESEARCHER` into `INSTRUCTOR` (content) + `ADMIN` (system) | Separates content authoring from system governance — standard LMS separation of concerns |
| G4 | Remove Thai-teacher-training vocabulary from the schema (TOR stays; schema goes generic) | Allows the product to be reused for any training program |
| G5 | Preserve all existing v2 features (upload, review workflow, quiz, certificate, leaderboard, export) | TOR acceptance still holds; no regression |

**Non-goals:**
- Not rewriting from scratch — v2 DB is migrated, not dropped.
- Not adding new product capabilities (chat, live video, SSO, AI grading) — those remain in v2's out-of-scope list.
- Not changing the stack (Next.js 15 + Prisma + PostgreSQL + MinIO + NextAuth).

---

## 2. Role Model: Before → After

### 2.1 Before (v2)

```
┌─────────────┐       ┌─────────────┐       ┌──────────────┐
│   CAT       │──────→│   CAM       │──────→│  RESEARCHER  │
│ (trainee)   │ 1..N  │ (mentor +   │       │ (admin +     │
│             │   :1  │  learner)   │       │  content +   │
│             │       │             │       │  analytics)  │
└─────────────┘       └─────────────┘       └──────────────┘
```
- CAM had **two overlapping duties**: taking courses (as a learner) AND reviewing CAT submissions.
- RESEARCHER held **three concerns**: user management, content CRUD, analytics.

### 2.2 After (v3)

```
┌──────────┐   enrolls   ┌──────────┐   authored by   ┌──────────────┐
│ STUDENT  │────────────→│  COURSE  │←────────────────│  INSTRUCTOR  │
│          │             │          │                  │              │
└────┬─────┘             └──────────┘                  └──────────────┘
     │ submits
     ▼
┌──────────┐  reviewed by  ┌──────────┐
│SUBMISSION│──────────────→│  MENTOR  │
└──────────┘               └──────────┘

        ┌─────────┐
        │  ADMIN  │ ── manages users, roles, system, exports
        └─────────┘
```

### 2.3 Role Matrix

| Capability | STUDENT | MENTOR | INSTRUCTOR | ADMIN |
|---|---|---|---|---|
| Request enrollment in published courses | ✅ | ✅ (optional) | — | — |
| Approve / reject enrollment requests | — | — | ✅ (own courses) | ✅ (all) |
| Cancel own pending enrollment request | ✅ | ✅ | — | — |
| Take lessons, quizzes (when APPROVED) | ✅ | ✅ (optional) | — | — |
| Submit assignments | ✅ | — | — | — |
| Earn certificates | ✅ | — | — | — |
| Review submissions (score + feedback) | — | ✅ | ✅ | ✅ |
| Watch & score supervision videos | — | ✅ | ✅ | ✅ |
| Create/edit courses, sections, lessons, quizzes | — | — | ✅ | ✅ |
| Configure quiz gates (PRE_TEST / section / POST_TEST) | — | — | ✅ | ✅ |
| Upload teaching materials | — | — | ✅ | ✅ |
| Create evaluation rounds | — | — | — | ✅ |
| Pair STUDENT ↔ MENTOR | — | — | — | ✅ |
| Import users (CSV) | — | — | — | ✅ |
| Export data (CSV/Excel) | — | ✅ (own mentees) | — | ✅ (all) |
| View system-wide leaderboard | — | ✅ | ✅ | ✅ |
| Manage user roles & activation | — | — | — | ✅ |

**Key rules:**
- STUDENT↔MENTOR pairing stays **one-to-many** (one mentor, many students). Backward-compatible with the TOR's CAT↔CAM rule.
- MENTOR is a **pure reviewer** — no learner artifacts (enrollments, quiz attempts, certificates) required, but NOT forbidden (a mentor may self-enroll to sample a course).
- INSTRUCTOR is **content-only**; they cannot touch user accounts or exports.
- ADMIN is a **superset** of all roles' capabilities.

---

## 3. Data Model (Schema Changes vs v2)

### 3.1 Enum Rename

```prisma
// v2
enum UserRole { CAT CAM RESEARCHER }

// v3
enum UserRole { STUDENT MENTOR INSTRUCTOR ADMIN }
```

Migration mapping (see Doc 2 for exact SQL):

| v2 value | v3 value | Notes |
|---|---|---|
| `CAT` | `STUDENT` | Pure learners |
| `CAM` | `MENTOR` | Reviewer (default). If a CAM was also taking courses, they retain enrollments but the **primary** role becomes MENTOR. A follow-up admin action can clone them as STUDENT if needed. |
| `RESEARCHER` | `ADMIN` | All existing researchers become ADMIN. **Manual step:** ADMIN reviews the list and demotes content-only researchers to INSTRUCTOR. |

### 3.2 User Model (Rename `schoolName` → `groupName`)

```prisma
// v2
model User {
  ...
  schoolName String?
  mentorId   String?     // CAT → CAM
  mentees    User[]      @relation("Mentorship")
  mentor     User?       @relation("Mentorship", fields: [mentorId], references: [id])
}

// v3
model User {
  ...
  groupName  String?     // generic grouping (was schoolName)
  mentorId   String?     // STUDENT → MENTOR
  mentees    User[]      @relation("Mentorship")
  mentor     User?       @relation("Mentorship", fields: [mentorId], references: [id])
}
```

- `groupName` is a free-text organizational label (school, cohort, department, batch, etc.). Leaderboards that used to group by `schoolName` now group by `groupName`.
- The mentorship self-relation is preserved byte-for-byte; only the semantic meaning of the endpoints changes.

### 3.3 Course (New: `authorId` + `category`)

```prisma
model Course {
  id           String  @id @default(cuid())
  title        String
  slug         String  @unique
  description  String?
  coverImageKey String?          // NEW — MinIO key for cover image
  category     String?           // NEW — free-text tag (e.g. "Mathematics", "Safety")
  level        CourseLevel?      // NEW — enum below
  authorId     String?           // NEW — INSTRUCTOR or ADMIN who owns the course
  author       User?   @relation("CourseAuthor", fields: [authorId], references: [id])
  isPublished  Boolean @default(false)
  ...
}

enum CourseLevel { BEGINNER INTERMEDIATE ADVANCED }
```

### 3.4 Other Model Renames

| v2 concept | v3 concept | Change |
|---|---|---|
| `SupervisionVideo` | `ObservationVideo` | Rename table; columns identical. "Supervision" is domain-specific; "observation" reads as a generic teaching video upload/review. |
| `EvaluationRound.maxScore` → keep; add `description` | `EvaluationRound` | Add `description String?` + `rubricJson Json?` so admins can embed a scoring rubric. |
| `Notification.type` enum | add 2 new values | Add `ASSIGNMENT_DUE_SOON`, `NEW_COURSE_AVAILABLE`. |

### 3.5 New Model — `CourseCategory` (Optional, Phase 3)

For a general LMS, deferred to Phase 3 (see Doc 4). A free-text `Course.category` unblocks v3 day 1; a lookup table can be added later without breaking migrations.

### 3.6 Deleted from Spec (not schema)

Nothing removed at the schema level — v2 tables all survive. Only **labels** change in the UI. This keeps migrations reversible.

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (Chrome/Firefox/Safari/Edge)       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────────┐
│                        Next.js 15 App Router                        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  middleware.ts  → NextAuth JWT check + role-gate routes       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ (student)   │  │ (mentor)     │  │ (instructor) │  │ (admin)  │ │
│  │ /dashboard  │  │ /review      │  │ /teach       │  │ /admin   │ │
│  │ /courses    │  │ /observe     │  │ /teach/[id]  │  │ /admin/* │ │
│  │ /quizzes    │  │ /mentees     │  │              │  │          │ │
│  │ /certs      │  │              │  │              │  │          │ │
│  └─────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Server Actions + Route Handlers (/api/*)                     │  │
│  │  ├── /api/auth/[...nextauth]                                  │  │
│  │  ├── /api/upload          (MinIO multipart)                   │  │
│  │  ├── /api/files/[key]     (presigned GET)                     │  │
│  │  ├── /api/certificate/generate                                │  │
│  │  ├── /api/export/{scores|progress|quiz-attempts|users}        │  │
│  │  └── /api/webhooks/*      (future: email, SMS)                │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────┬────────────────────────────┬───────────────────────┬──────────┘
      │                            │                       │
      ▼                            ▼                       ▼
┌──────────────┐           ┌──────────────┐        ┌───────────────┐
│ PostgreSQL   │           │    MinIO     │        │  Prisma       │
│   (Prisma)   │           │ (S3-compat)  │        │  Migrations   │
│              │           │              │        │               │
│ - users      │           │ - /lessons   │        │ versioned SQL │
│ - courses    │           │ - /submis... │        │ in git        │
│ - quizzes    │           │ - /videos    │        │               │
│ - submissions│           │ - /certs     │        │               │
│ - evaluations│           │ - /covers    │        │               │
└──────────────┘           └──────────────┘        └───────────────┘
```

### 4.1 Route Groups (App Router)

```
app/
├── (auth)/                  # public
│   ├── login/
│   └── register/            # NEW (optional in v3) — admin can still CSV-import
├── (student)/               # STUDENT + (MENTOR/INSTRUCTOR/ADMIN may view)
│   ├── dashboard/
│   ├── courses/
│   ├── courses/[slug]/
│   ├── courses/[slug]/lessons/[id]/
│   ├── certificates/
│   └── evaluations/self/
├── (mentor)/                # MENTOR + ADMIN + INSTRUCTOR
│   ├── review/
│   ├── review/[submissionId]/
│   ├── mentees/
│   ├── mentees/[studentId]/
│   ├── observe/             # renamed from /supervision
│   └── evaluations/grade/[roundId]/
├── (instructor)/            # INSTRUCTOR + ADMIN
│   ├── teach/
│   ├── teach/[courseId]/
│   ├── teach/[courseId]/lessons/new/
│   └── teach/[courseId]/quizzes/
├── admin/                   # ADMIN only
│   ├── users/
│   ├── users/import/
│   ├── pairings/            # STUDENT↔MENTOR assignment UI
│   ├── courses/             # all courses (INSTRUCTOR can only see own)
│   ├── evaluations/         # rounds config
│   ├── reports/
│   └── exports/
└── api/
```

### 4.2 RBAC Enforcement (3 layers)

1. **`middleware.ts`** — gate route groups by role before rendering. Unauthorized → redirect to role-appropriate dashboard.
2. **Layout-level server guards** — each route group's `layout.tsx` calls `requireRole(...)`; a bypass of middleware is still blocked.
3. **Server Action / Route Handler guards** — every mutation re-checks role + resource ownership (e.g. "this mentor is assigned to this student").

**Rule:** never rely on middleware alone. Always assume middleware is off and re-check in the handler.

### 4.3 File Storage Layout (MinIO)

```
mini-lms-storage/
├── public/
│   └── covers/{courseId}.{jpg|png}          # course cover images (anonymous read)
├── lessons/{lessonId}/{uuid}.{ext}          # teaching materials
├── submissions/{submissionId}/{uuid}.{ext}  # student uploads
├── videos/{userId}/{uuid}.{mp4|mov}         # observation videos
└── certificates/{userId}/{courseId}.pdf     # generated certs
```

Presigned URLs (10-min TTL) are issued by `/api/files/[...key]` after RBAC check. The `public/` prefix is the only bucket path with anonymous read (for course covers on the public landing).

---

## 5. Technology Choices (unchanged from v2, documented here)

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Already in repo; SSR + RSC keeps roles enforced server-side |
| DB | PostgreSQL 15 via Prisma 6 | Already in repo |
| Object Storage | MinIO (S3-compat) | Already in repo; self-hostable, matches TOR §3.1 cloud-server requirement |
| Auth | NextAuth 4 (Credentials + JWT) | Already in repo; JWT supports `role` claim for middleware checks |
| UI | shadcn/ui + Tailwind | Accessible by default |
| Markdown | react-markdown + Shiki | Already wired |
| PDF | `@react-pdf/renderer` (server-only) | For certificate generation |
| Excel | `xlsx` | Already in repo (CSV import); reuse for export |
| Testing | Vitest (unit/integration) + Playwright (e2e) | Already in repo |

---

## 6. TOR Compliance Mapping (v3 role names)

| TOR Clause | v2 Role | v3 Role | Status |
|---|---|---|---|
| 2.1.1(1) User import | RESEARCHER | ADMIN | Unchanged flow |
| 2.1.1(2) Auth + RBAC | All | All | Broadened to 4 roles |
| 2.1.2 Course/Lesson/Quiz | RESEARCHER | INSTRUCTOR + ADMIN | Split per G3 |
| 2.1.3 ครู CAT perms | CAT | STUDENT | Renamed |
| 2.1.3 ครู CAM perms (reviewer side) | CAM | MENTOR | Renamed |
| 2.1.3 ครู CAM perms (learner side) | CAM | STUDENT | Merged |
| 2.1.3 นักวิจัย perms (content) | RESEARCHER | INSTRUCTOR | Split |
| 2.1.3 นักวิจัย perms (admin + export + pairing) | RESEARCHER | ADMIN | Split |
| 2.2 Evaluation & observation | All | MENTOR + ADMIN | Renamed |
| 3.1 Cloud server | — | — | Unchanged |
| 3.2 Session mgmt | — | — | Unchanged |
| 3.3 Web-browser responsive | — | — | Unchanged |

**Critical:** the TOR acceptance criteria do not care about role names — they care about capabilities. The v3 role split is a refactor that preserves every capability.

---

## 7. Plan Document Index

| Doc | Phase | Scope | Payment Tranche |
|---|---|---|---|
| **1 (this)** | — | Overview + architecture + role model | — |
| **2** | Phase 1 | Schema migration, role rename, auth/RBAC, user-mgmt UI | §2.1 (70% — Day 45) |
| **3** | Phase 2 | Course/Lesson/Quiz (instructor content pipeline), enrollment, progress | §2.1 |
| **4** | Phase 3 | Assignments, submissions, mentor pairing, review workflow | §2.1 |
| **5** | Phase 4 | Evaluations, observation videos, certificates, dashboard/leaderboard, reports/export, notifications, deployment | §2.2 (30% — Day 90) |

Each phase doc contains:
- Scope & non-goals
- Schema deltas (Prisma diffs)
- Routes & page inventory for this phase
- Server Actions / API endpoints
- Acceptance criteria (TOR-mapped)
- Test plan (unit / integration / e2e)
- Risks & mitigations

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Migration from `RESEARCHER` → `INSTRUCTOR`/`ADMIN` split is subjective | Wrong users get over-privileged | Default all RESEARCHERs to ADMIN, then require an admin to demote to INSTRUCTOR after review. Log the manual step. |
| Existing CAM users with active enrollments lose learner capabilities | CAM's in-flight coursework lost | MENTOR role can still take courses (matrix allows it). Enrollments/attempts remain attached. |
| `schoolName` → `groupName` rename breaks existing leaderboard queries | Dashboard regression | Single atomic migration; keep column name consistent in code. Full test sweep post-migration. |
| TOR reviewer evaluates against old role names | Compliance dispute | Phase 1 ships a translation layer: UI labels `STUDENT → "ครู (ผู้เรียน)"` / `MENTOR → "ครูพี่เลี้ยง"` / `ADMIN → "ผู้ดูแลระบบ"` during UAT; revert to generic labels post-acceptance. |
| Presigned-URL scope creep (mentor reads another mentor's files) | Data leak | `/api/files/[key]` resolves the owning submission/video, then checks `canAccessFile(session, resource)`. Never serve by key alone. |
| Prisma enum change requires DB downtime | Short outage during deploy | Run migration during maintenance window; enum rewrite is O(rows) on the user table (~100s of rows) — sub-second. |

---

## 9. Definition of Done (v3)

- [ ] All four roles functional with the capability matrix in §2.3 honored
- [ ] v2 DB migrated in place (no data loss)
- [ ] All TOR §2.1 and §2.2 acceptance criteria pass with v3 role names
- [ ] Tests green: 20+ existing tests adapted + new tests per phase doc
- [ ] UAT sign-off on both Thai-label and generic-label UI configurations
- [ ] Backup + restore procedure documented
- [ ] README updated with v3 role model

---

**Next → [Doc 2: Foundation & Auth/RBAC](./mini-lms-v3-02-foundation-auth-rbac.md)**
