# CLAUDE.md — LMS Project Conventions

This file tells AI agents how this codebase is structured and how to work in it correctly.

---

## Stack

- **Next.js 15 App Router** — server components by default; client components only when interactivity is required
- **Prisma 6 + PostgreSQL** — type-safe ORM; schema in `prisma/schema.prisma`
- **NextAuth.js v4** — credentials provider; session accessed via `getServerSession(authOptions)` in API routes, `requireAuth()` or `requireRole()` in server components/actions
- **shadcn/ui** — component library at `components/ui/`; do not build custom primitives for things already in shadcn
- **Vitest** — test runner: `npx vitest run --pool=forks`
- **Tailwind CSS** — utility-first; no custom CSS files

---

## Auth helpers (always use these, never roll your own)

```ts
// In server components / server actions:
import { requireAuth } from "@/lib/permissions";           // throws redirect if not authed
import { requireRole } from "@/lib/permissions";           // requireRole("ADMIN", "INSTRUCTOR")
import { canAuthor } from "@/lib/permissions";             // true for ADMIN or INSTRUCTOR

// In API routes:
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
const session = await getServerSession(authOptions);
```

---

## Mutations: server actions, not API routes

All write operations use Next.js server actions (files named `actions.ts` next to the page). API routes (`app/api/`) are only used for:
- File downloads / streaming responses
- CSV exports
- Webhooks / external callbacks

Never create a REST endpoint for a form submit or button click. Use a server action.

---

## Database access

- Always import from `@/lib/prisma` — never instantiate `new PrismaClient()` directly
- Prefer `include` over separate queries when joining; use `select` to limit fields in list queries
- For counts, use `_count: { select: { relation: true } }` in the `include`
- `findMany` with `orderBy` before `include` for predictable ordering

---

## Roles and permissions

Four roles: `STUDENT`, `INSTRUCTOR`, `MENTOR`, `ADMIN`.

| Check | Helper |
|-------|--------|
| User is logged in | `requireAuth()` |
| User is ADMIN or INSTRUCTOR | `canAuthor(user.role)` |
| User is ADMIN, INSTRUCTOR, or MENTOR | check `["ADMIN", "INSTRUCTOR", "MENTOR"].includes(role)` |
| Student owns a submission | `canAccessSubmission(user, submission)` in `lib/permissions.ts` |

---

## File storage

All uploads go through `lib/minio.ts`. Keys follow the pattern:
- `courses/<courseId>/cover.<ext>` — course cover images
- `assignments/<assignmentId>/<filename>` — assignment attachments
- `submissions/<submissionId>/<filename>` — student file submissions
- `certificates/<userId>/<courseId>.pdf` — issued certificates

Download URL: `/api/files/<key>` — this route checks permissions before serving.

---

## Scoring system

`lib/course-score.ts` exports `getStudentCourseScore(userId, courseId)` which returns a `ScoreBreakdown`. Key rules:
- 4 weighted components: `lessonQuiz`, `sectionQuiz`, `lessonAssignment`, `courseAssignment`
- Components with `score = null` (no items or no attempts) are **excluded from the denominator** — weight auto-redistributes
- Config auto-created on first read via upsert (default 25/25/25/25)
- See ADR-005 for rationale

---

## Quiz linking

A quiz can be placed on a lesson (via `LessonQuiz` join table) or a section (via `SectionQuiz` join table), or as the course pre/post-test (direct FK on `Course`). The UI presents a single dropdown ("link to lesson / section / none") even though the underlying schema is many-to-many. When relinking, detach all existing links first, then attach the new one.

---

## Testing conventions

- Unit tests live in `tests/unit/` and test **pure business logic only** (no Prisma, no Next.js)
- Extract pure helpers from server components to test them — don't mock Prisma
- Run with `npx vitest run --pool=forks`
- Target: write tests before implementation (RED → GREEN)
- Do not write integration tests that require a running DB

---

## Thai language

UI copy is in Thai. Keep all user-facing strings in Thai. Error messages surfaced to users should also be in Thai.

---

## Patterns to follow

- `export const dynamic = "force-dynamic"` at the top of every page that reads live data
- Server action files are always named `actions.ts` and co-located with the page they serve
- Server actions `revalidatePath` after any mutation — revalidate the narrowest path possible
- Use `notFound()` from `next/navigation` for missing resources, `redirect()` for auth failures
- `params` in Next.js 15 is a `Promise<{...}>` — always `await params` before destructuring
