# 01 · Architecture

Aligned with code at `mini-lms/` as of **2026-04-18**.

## 1. Scope

Mini LMS is a Thai-language **supervision / coaching learning-management system** for Kalasin University. It supports course authoring, self-paced study, assignment submission with human review, quizzes, evaluation rounds, observation videos, certificates, and role-based dashboards — all delivered from a single Next.js deployment.

## 2. Roles

Four roles, defined in Prisma as `enum UserRole` and checked in `lib/permissions.ts` + `middleware.ts`:

| Role | Abilities |
|------|-----------|
| `STUDENT` | Browse catalog, enroll, view lessons, take quizzes, upload assignment submissions, view own certificates |
| `MENTOR` | Review submissions of assigned mentees (via `User.mentorId`), leave feedback/score, grade evaluation rounds, upload observation videos, score observations |
| `INSTRUCTOR` | Author courses + lessons + quizzes (`/teach/*`), manage enrollments, all MENTOR review abilities |
| `ADMIN` | Everything above + user management (`/admin/users`), enrollment approvals (`/admin/enrollments`), evaluation round config, exports, system health |

> **TOR → Role mapping** (from archived v3-01 §6):
> - Original TOR named CAT (trainee), CAM (mentor-coach), Researcher. In this implementation CAT → `STUDENT`, CAM → `MENTOR`, Researcher → `INSTRUCTOR`. `ADMIN` is an operational role added for deployment, not called out in TOR.

## 3. System architecture

```mermaid
flowchart LR
  Browser -->|HTTPS| NextJS[Next.js 15 App Router]
  NextJS -->|@prisma/client| PG[(PostgreSQL 16)]
  NextJS -->|@aws-sdk S3| MinIO[(MinIO S3)]
  NextJS -->|credentials| NextAuth[NextAuth JWT]
  subgraph Node Runtime
    NextJS
  end
  subgraph Docker (local)
    PG
    MinIO
  end
```

- **Single deployable**: one Next.js process serves RSC pages, server actions, API routes.
- **No separate backend service** — domain logic lives in `lib/*.ts` and is invoked directly from RSC pages and server actions.
- **Persistence**: PostgreSQL for structured data; MinIO for uploads (lesson covers, attachments, submission files, supervision/observation videos, certificate PDFs).
- **Auth**: NextAuth credentials provider, **JWT** session, 4-hour expiry with 1-hour rolling refresh.

## 4. Technology stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js **15** (App Router, React 19, RSC + Server Actions) |
| Language | TypeScript 5.7 (strict) |
| Auth | NextAuth v4 (CredentialsProvider, JWT, bcryptjs) |
| Database | PostgreSQL 16 via Prisma 6 |
| Object storage | MinIO (S3-compatible), `@aws-sdk/client-s3` + `s3-request-presigner` |
| Validation | Zod |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix primitives) + lucide-react icons |
| Typography | **Prompt** via `next/font/google`, latin + thai subsets |
| Markdown | `react-markdown`, `remark-gfm`, `rehype-slug`, `rehype-pretty-code` + `shiki` |
| Spreadsheet export | `xlsx` |
| Testing | Vitest + Testing Library + Playwright |
| Local infra | Docker Compose (`docker:up` / `docker:down`) |

## 5. Directory layout

```
mini-lms/
├── app/                    App Router
│   ├── (public) page.tsx, login/, layout.tsx
│   ├── dashboard/          Role dispatcher
│   ├── courses/            Student catalog & lesson viewer
│   ├── certificates/       Issued certificates listing
│   ├── admin/              ADMIN only: users, enrollments, courses, evaluations, pairings
│   ├── teach/              INSTRUCTOR|ADMIN: course/lesson/quiz/assignment authoring
│   ├── review/             MENTOR|INSTRUCTOR|ADMIN: submission review
│   ├── mentees/            MENTOR|ADMIN: mentee roster
│   ├── observe/            MENTOR|INSTRUCTOR|ADMIN: observation videos
│   ├── evaluations/        Evaluation rounds (self-eval + peer grading)
│   ├── submissions/        Student's own submissions
│   ├── videos/             Supervision/teaching video gallery
│   ├── reports/            progress, leaderboard
│   └── api/                auth, upload, files, certificate/generate, exports, notifications, observe/videos, health
├── components/
│   ├── ui/                 shadcn primitives
│   ├── shell/              AppShell + sidebar (role-aware)
│   ├── shared/             Cross-feature (file-upload-dropzone)
│   ├── markdown-renderer.tsx, youtube-player.tsx
│   └── <feature>/_components/   Colocated under page folders
├── lib/
│   ├── auth.ts, permissions.ts            NextAuth config + RBAC helpers
│   ├── prisma.ts                          Prisma singleton
│   ├── minio.ts                           S3 client + presign helper
│   ├── course-gates.ts, scoring.ts        Quiz + gating logic
│   ├── submission-state.ts                Submission state machine
│   ├── certificate.ts                     Completion check + PDF generation
│   ├── evaluation-stats.ts                Round averaging + leaderboard
│   ├── slug.ts, youtube.ts, utils.ts
│   └── validators/course.ts               Zod schemas
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── middleware.ts                          Route-level role gating
├── docker-compose.yml                     db (5434) + minio (9002/9003)
└── tests/                                 Vitest + Playwright
```

## 6. Runtime flows

### 6.1 Auth (NextAuth JWT)
1. `POST /login` → CredentialsProvider → `bcrypt.compare`.
2. JWT callback stamps `id`, `role`, `fullName` into token.
3. Session callback surfaces them on `session.user`.
4. `middleware.ts` inspects `getToken()` per request; redirects to `/login` or `/dashboard` based on role.

### 6.2 File upload
1. Client POSTs multipart to `/api/upload` with a `purpose` prefix (`lessons|covers|submissions|videos|profiles`).
2. Server authorises per purpose, streams to MinIO, returns `fileKey`.
3. Presigned GETs are served via `/api/files/preview/[...key]` (15-min TTL from `FILE_PRESIGN_TTL_SECONDS`).

### 6.3 Submission state machine (see `lib/submission-state.ts`)
`DRAFT → SUBMITTED → UNDER_REVIEW → (APPROVED | REVISION_REQUESTED | REJECTED)`. Revisions reopen from `REVISION_REQUESTED → SUBMITTED`, incrementing `reviewCycle`.

### 6.4 Certificate issuance
Triggered from student UI; `lib/certificate.ts` verifies course completion gates (all lessons complete, required quizzes passed), generates PDF, uploads via MinIO, stores `Certificate` record.

## 7. TOR compliance mapping

| TOR clause | Implementation |
|------------|----------------|
| §2.1.1 User import + roles + session mgmt | `/admin/users` + CSV importer, NextAuth JWT, `UserRole` enum |
| §2.1.2(1–4) Course mgmt, lessons, attachments | `/teach/*`, `Lesson`, `LessonAttachment`, MinIO |
| §2.1.2(5) Assignments + review | `Assignment`, `Submission`, `/review`, mentor-pairing scoped access |
| §2.1.2(6) Quizzes (Pre/Post/general) | `Quiz`, `QuizQuestion`, `QuizAttempt`, `LessonQuiz`, `SectionQuiz` |
| §2.1.2(7) Certificates | `Certificate`, `/api/certificate/generate`, `/certificates` |
| §2.1.2(8) Progress tracking | `LessonProgress`, `/reports/progress` |
| §2.1.2(9) Data export | `/api/export/{users,enrollments,submissions,completion,quiz-attempts,evaluation-scores}` |
| §2.2.1 Evaluation rounds + self-eval | `EvaluationRound`, `Evaluation`, `SelfEvaluation`, `/evaluations` |
| §2.2.2 Observation videos + scoring | `ObservationVideo`, `ObservationScore`, `/observe` |
| §2.2.3 Leaderboard | `lib/evaluation-stats.ts`, `/reports/leaderboard` |
| §2.2.4 Progress reports | `/reports/progress` |
| §3.* Responsive web + cloud deployment | Tailwind responsive, Docker Compose template |

## 8. Non-functional

- **Session**: JWT 4h / 1h rolling — per `lib/auth.ts`.
- **File size caps**: Assignment files 10 MB (enforced via Prisma default `maxFileSize`); observation videos (per design) target ≤ 500 MB.
- **Presign TTL**: 15 minutes (`FILE_PRESIGN_TTL_SECONDS=900`).
- **Responsive breakpoints**: Tailwind defaults; sidebar collapses at `md` to a `Sheet`.
- **i18n**: Thai UI throughout. `html lang="th"`. Prompt font covers both Thai and Latin glyphs.

## 9. Risks & open questions

See [06-implementation-plan.md](./06-implementation-plan.md) for the active punch-list. Forward-looking design work (enrollment approval refinement, course sections, quiz gates) is in [07-backlog.md](./07-backlog.md).
