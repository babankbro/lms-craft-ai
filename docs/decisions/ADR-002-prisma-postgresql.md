# ADR-002: Prisma ORM with PostgreSQL

## Status
Accepted

## Date
2026-04-19

## Context

The LMS has a deeply relational data model: users → enrollments → courses → sections → lessons → quizzes → attempts, and a parallel submission/grading workflow. The database layer needs:
- Relational integrity (foreign keys, cascades)
- Type-safe queries in TypeScript
- Schema migration management
- Complex joins with optional includes

## Decision

Use **PostgreSQL** as the database and **Prisma** as the ORM.

## Alternatives Considered

### Drizzle ORM
- Pros: Lighter weight, closer to raw SQL, good TypeScript inference
- Cons: Less mature ecosystem at the time; schema definition and migration story less ergonomic for rapid iteration
- Rejected: Prisma's `include` syntax maps more naturally to this project's nested data fetching patterns

### Kysely (query builder, no ORM)
- Pros: Full SQL control, excellent type safety
- Cons: No schema migration management; requires writing migrations by hand
- Rejected: Schema evolves frequently during development; Prisma's `migrate dev` provides a tighter loop

### MongoDB
- Pros: Flexible schema
- Cons: The data model is fundamentally relational (many-to-many quiz placements, submission state machines, enrollment status); a document store would require manual relationship management
- Rejected: Wrong tool for a relational domain

## Consequences

- `prisma/schema.prisma` is the single source of truth for the data model
- `npx prisma migrate dev` generates and applies typed migrations
- All imports use `@/lib/prisma` — a singleton client to avoid connection pool exhaustion in Next.js dev mode
- Prisma's `_count` syntax is used extensively for efficient count-only queries
- Complex multi-join queries sometimes require `(prisma.model.findUnique as any)({...})` casts because Prisma's deep-include inference can exceed TypeScript's complexity limits
