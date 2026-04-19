# 01 · Architecture

Aligned with code as of **2026-04-19**.

## 1. Scope

This is a Thai-language **supervision / coaching learning-management system** for Kalasin University. It supports course authoring, self-paced study, assignment submission with human review, quizzes, weighted score management, evaluation rounds, observation videos, certificates, and role-based dashboards — all delivered from a single Next.js deployment.

## 2. Roles

Four roles, defined in Prisma as `enum UserRole` and checked in `lib/permissions.ts` + `middleware.ts`:

| Role | Abilities |
|------|-----------|
| `STUDENT` | Browse catalog, enroll, view lessons, take quizzes, submit assignments, view own scores + certificates |
| `MENTOR` | Review submissions of assigned mentees (via `User.mentorId`), leave feedback/score, grade evaluation rounds, upload/score observation videos |
| `INSTRUCTOR` | Author courses + lessons + quizzes + assignments (`/teach/*`), manage enrollments, configure score weights, view score roster; all MENTOR review abilities |
| `ADMIN` | Everything above + user management (`/admin/users`), enrollment approvals, evaluation round config, exports, system health |

> **TOR → Role mapping**: Original TOR named CAT (trainee), CAM (mentor-coach), Researcher. CAT → `STUDENT`, CAM → `MENTOR`, Researcher → `INSTRUCTOR`. `ADMIN` is an operational role added for deployment.

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

- **Single deployable**: one Next.js process serves RSC pages, server actions, and API routes.
- **No separate backend service** — domain logic lives in `lib/*.ts` and is invoked directly from RSC pages and server actions.
- **Persistence**: PostgreSQL for structured data; MinIO for uploads (lesson/assignment attachments, submission files, observation videos, certificate PDFs, course covers).
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
| Email | `nodemailer` + `OutboundEmail` queue table |
| Testing | Vitest (`npm test` / `npx vitest run --pool=forks`) |
| Local infra | Docker Compose (`npm run docker:up` / `docker:down`) |

## 5. Directory layout

```
lms/
├── app/                    App Router
│   ├── (auth)/             login page (unauthenticated)
│   ├── dashboard/          Role dispatcher → StudentDashboard / MentorDashboard / InstructorDashboard / AdminDashboard
│   ├── courses/            Student catalog & lesson viewer
│   │   └── [slug]/         Course detail, lessons, quizzes, assignments, score breakdown
│   ├── certificates/       Issued certificates listing
│   ├── submissions/        Student's own submissions list + detail
│   ├── admin/              ADMIN only: users, enrollments, courses, evaluations, pairings
│   ├── teach/              INSTRUCTOR|ADMIN: course/lesson/quiz/assignment authoring + score config + scores roster
│   ├── review/             MENTOR|INSTRUCTOR|ADMIN: submission review
│   ├── mentees/            MENTOR|ADMIN: mentee roster + drill-down
│   ├── observe/            MENTOR|INSTRUCTOR|ADMIN: observation video upload + scoring
│   ├── evaluations/        Evaluation rounds (self-eval + peer grading)
│   ├── videos/             Teaching video gallery
│   ├── reports/            progress, leaderboard
│   └── api/                auth, upload, files, certificate/generate, export/*, notifications, observe/videos, health, email/flush
├── components/
│   ├── ui/                 shadcn primitives
│   ├── shell/              AppShell, sidebar (role-aware), notification bell
│   ├── shared/             Cross-feature (file-upload-dropzone)
│   ├── markdown-renderer.tsx, youtube-player.tsx
│   └── <feature>/_components/   Colocated under page folders
├── lib/
│   ├── auth.ts, permissions.ts            NextAuth config + RBAC helpers
│   ├── prisma.ts                          Prisma singleton
│   ├── minio.ts                           S3 client + presign helper
│   ├── course-score.ts                    Weighted score calculation (4 components)
│   ├── course-gates.ts, scoring.ts        Quiz gating + attempt scoring logic
│   ├── submission-state.ts                Submission state machine + recall guard
│   ├── certificate.ts                     Completion check + cert issuance
│   ├── evaluation-stats.ts                Round averaging + leaderboard
│   ├── attachment-visibility.ts           AttachmentVisibility resolver (shared by two API routes)
│   ├── mailer.ts                          OutboundEmail queue + SMTP flush
│   ├── mime-sniff.ts                      Magic-byte MIME validation
│   ├── slug.ts, youtube.ts, utils.ts
│   └── validators/course.ts               Zod schemas
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/unit/                            Vitest unit tests (pure logic, no DB)
├── docs/                                  System spec + ADRs + data-model-relationships
├── doc/                                   Legacy canonical docs (01–08) — still maintained
├── tasks/                                 Implementation plans + todo.md
├── middleware.ts                          Route-level role gating
└── docker-compose.yml                     db (5434) + minio (9002/9003)
```

## 6. Runtime flows

### 6.1 Auth (NextAuth JWT)
1. `POST /login` → CredentialsProvider → `bcrypt.compare`.
2. JWT callback stamps `id`, `role`, `fullName` into token.
3. Session callback surfaces them on `session.user`.
4. `middleware.ts` inspects `getToken()` per request; redirects to `/login` or `/dashboard` based on role.

### 6.2 File upload
1. Client POSTs multipart to `/api/upload` with a `prefix` field (`lessons|covers|submissions|videos|assignments`).
2. Server authorises per prefix, sniffs magic bytes via `lib/mime-sniff.ts`, streams to MinIO, returns `fileKey`.
3. Downloads served via `/api/files/[...key]` (direct streaming) or `/api/files/preview/[...key]` (presigned URL, 15-min TTL).

### 6.3 Submission state machine (see `lib/submission-state.ts`)
```
DRAFT → SUBMITTED → UNDER_REVIEW → (APPROVED | REVISION_REQUESTED | REJECTED)
REVISION_REQUESTED → SUBMITTED (reviewCycle += 1)
SUBMITTED → DRAFT (recall — before dueDate only)
```

### 6.4 Certificate issuance
Triggered by `markLessonComplete` (fire-and-forget) or by explicit student request. `lib/certificate.ts::maybeIssueCertificate` verifies all lessons complete + required quizzes passed, generates PDF, uploads to MinIO, stores `Certificate` row. Idempotent.

### 6.5 Weighted course score
`lib/course-score.ts::getStudentCourseScore(userId, courseId)` computes 4 components (lesson quizzes, section quizzes, lesson assignments, course assignments) weighted by `CourseScoreConfig`. Components with no items are excluded from the denominator (auto-redistribute). See `docs/decisions/ADR-005`.

## 7. TOR compliance mapping

| TOR clause | Implementation |
|------------|----------------|
| §2.1.1 User import + roles + session mgmt | `/admin/users` + `importUsersCSV`, NextAuth JWT, `UserRole` enum |
| §2.1.2(1–4) Course mgmt, lessons, attachments | `/teach/*`, `Lesson`, `LessonAttachment`, MinIO, drag-reorder |
| §2.1.2(5) Assignments + review | `Assignment` (lesson + course-level), `Submission`, `/review`, mentor-pairing scoped access |
| §2.1.2(6) Quizzes (Pre/Post/general) | `Quiz`, `QuizQuestion`, `QuizAttempt`, `LessonQuiz`, `SectionQuiz`, course pre/post FKs |
| §2.1.2(7) Certificates | `Certificate`, `/api/certificate/generate`, `/certificates`, auto-trigger on completion |
| §2.1.2(8) Progress tracking | `LessonProgress`, score breakdown panel, `/reports/progress` |
| §2.1.2(9) Data export | `/api/export/{users,enrollments,submissions,completion,quiz-attempts,evaluation-scores,course-scores}` |
| §2.2.1 Evaluation rounds + self-eval | `EvaluationRound`, `Evaluation`, `SelfEvaluation`, `/evaluations` |
| §2.2.2 Observation videos + scoring | `ObservationVideo`, `ObservationScore`, `/observe` |
| §2.2.3 Leaderboard | `lib/evaluation-stats.ts`, `/reports/leaderboard` |
| §2.2.4 Progress reports | `/reports/progress` with group filter |
| §3.* Responsive web + cloud deployment | Tailwind responsive, Docker Compose template |

## 8. Non-functional

- **Session**: JWT 4h / 1h rolling — per `lib/auth.ts`.
- **File size caps**: Assignment attachments 25 MB; submission files 50 MB; observation videos 500 MB; course covers 5 MB.
- **Presign TTL**: 15 minutes (`FILE_PRESIGN_TTL_SECONDS=900`).
- **Responsive breakpoints**: Tailwind defaults; sidebar collapses at `md` to a `Sheet`.
- **i18n**: Thai UI throughout. `html lang="th"`. Prompt font covers both Thai and Latin glyphs.
- **Email**: `OutboundEmail` queue table + `lib/mailer.ts`; flushed via `POST /api/email/flush`. Configurable via `SMTP_*` env vars.

## 9. Open gaps

See [06-implementation-plan.md](./06-implementation-plan.md) for the P0/P1/P2 punch-list and `tasks/todo.md` for the active Phase 2+ sprint breakdown.
