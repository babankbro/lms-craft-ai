# LMS — Learning Management System

A full-featured LMS for Thai-language education: courses, lessons, quizzes, assignments, grading, certificates, and instructor tools.

## Quick Start

```bash
# 1. Start local services (PostgreSQL on :5434, MinIO on :9002/:9003)
npm run docker:up

# 2. Install dependencies
npm install

# 3. Copy environment template and fill in values
cp .env.example .env

# 4. Apply database migrations
npm run db:migrate

# 5. Seed dev data (all roles, sample courses, quizzes, assignments)
npm run seed

# 6. Start dev server
npm run dev
```

App runs at `http://localhost:3000`.

### Default seed accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@ksu.ac.th` | `password123` | ADMIN |
| `instructor@ksu.ac.th` | `password123` | INSTRUCTOR |
| `mentor1@school.ac.th` | `password123` | MENTOR |
| `student1@school.ac.th` | `password123` | STUDENT |

> Multiple mentor + student accounts are seeded (mentor1/mentor2, student1–studentN). See `prisma/seed.ts` for the full list.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build (generate + migrate deploy + build) |
| `npm run lint` | ESLint check |
| `npm run seed` | Seed dev data (`npx tsx prisma/seed.ts`) |
| `npm run db:migrate` | Apply pending migrations (`prisma migrate dev`) |
| `npm run db:reset` | Reset DB and re-apply all migrations (destructive) |
| `npm run db:studio` | Browse database in browser |
| `npm run docker:up` | Start PostgreSQL + MinIO via Docker Compose |
| `npm run docker:down` | Stop Docker services |
| `npm test` | Run Vitest unit tests |
| `npm run test:ui` | Vitest with browser UI |
| `npm run test:coverage` | Vitest with coverage report |
| `npx vitest run --pool=forks` | Run tests without watch mode (CI-safe) |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth.js signing secret |
| `NEXTAUTH_URL` | Full app URL (e.g. `http://localhost:3000`) |
| `S3_ENDPOINT` | MinIO / S3 endpoint URL |
| `S3_BUCKET` | Bucket name for file uploads |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | S3 credentials |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Email settings |

## Architecture

### Stack

- **Next.js 15 (App Router)** — pages, layouts, server components, server actions
- **Prisma 6 + PostgreSQL** — data layer, migrations, type-safe queries
- **NextAuth.js v4** — credentials-based authentication, session management
- **MinIO (S3-compatible)** — file storage for uploads and course assets
- **Tailwind CSS + shadcn/ui** — styling and UI components
- **Vitest** — unit testing (pure business logic, no DB)
- **Nodemailer** — transactional email

### Key design decisions

See `docs/decisions/` for full ADRs. Short version:

- **No separate API layer for mutations** — server actions replace REST endpoints for all write operations; API routes are only used for downloads and webhooks (see ADR-001)
- **Quiz many-to-many, one-to-one UX** — the schema allows a quiz to be linked to multiple lessons/sections, but the UI presents a single dropdown to keep it simple (see ADR-004)
- **Weighted score with null-redistribution** — components with no items are excluded from the denominator so weight auto-redistributes to active components (see ADR-005)

### Project structure

```
app/
  (auth)/         Login / register pages
  admin/          Admin panel (course CRUD, user management, quiz builder)
  courses/        Student-facing course pages, lessons, quizzes, assignments
  teach/          Instructor workbench (course authoring, scores, enrollments)
  review/         Instructor submission review interface
  submissions/    Student submission list and detail
  api/            File download, CSV export, notifications, health check

lib/              Pure business logic (permissions, scoring, certificates, mailer)
components/       Shared UI components (shell, ui/)
prisma/           Schema, migrations, seed
tests/unit/       Vitest unit tests (pure logic only, no Prisma)
docs/decisions/   Architecture Decision Records
```

### Roles

| Role | Access |
|------|--------|
| `STUDENT` | Enroll, learn, submit, view own scores |
| `INSTRUCTOR` | Author courses, grade submissions, see roster |
| `MENTOR` | Grade submissions (read-only course access) |
| `ADMIN` | Full access — all courses, all users, admin panel |
