# Mini LMS — Documentation Index

> Last aligned with code: **2026-04-18**. Source of truth is `mini-lms/` (Next.js 15 + Prisma + NextAuth + MinIO).

## Canonical documents

| # | File | Purpose |
|---|------|---------|
| 00 | [00-index.md](./00-index.md) | This index |
| 01 | [01-architecture.md](./01-architecture.md) | System architecture, tech stack, role model, TOR compliance |
| 02 | [02-database-schema.md](./02-database-schema.md) | Prisma models, enums, ER diagram |
| 03 | [03-api-reference.md](./03-api-reference.md) | Every API route & server action |
| 04 | [04-features.md](./04-features.md) | Feature modules: auth, courses, assignments, evaluation, certificates |
| 05 | [05-ui-design-system.md](./05-ui-design-system.md) | Design tokens, Prompt typography, sidebar, page layout conventions |
| 06 | [06-implementation-plan.md](./06-implementation-plan.md) | **Canonical plan** — shipped + open work, Phase 2 sprint layout |
| 07 | [07-backlog.md](./07-backlog.md) | Stub — merged into 06 on 2026-04-18 |
| 08 | [08-quiz-assignment-plan.md](./08-quiz-assignment-plan.md) | Design record for the quiz + assignment-attachment feature (shipped Phase 1) |

## Source artefacts (do not edit)

- `requirement-utf8.txt` — Kalasin University Terms of Reference (Thai). **Contract source of truth.**
- `2รายละเอียดประกอบการจ้าง120,000.pdf` — Contract PDF.
- `archive/` — Pre-consolidation phase docs. Kept for historical traceability; do not rely on them for current state.

## How these docs relate to code

- **Architecture** (01) describes the *system*; **Database** (02) and **API** (03) describe *contracts* that align 1-to-1 with `prisma/schema.prisma` and `app/api/**` respectively.
- **Features** (04) describes *what each role can do* and maps to `app/<domain>/**` and `lib/**`.
- **UI design system** (05) is consumed by every page under `app/` and all components under `components/`.
- **Implementation plan** (06) is the single living plan — shipped items in §0, open P0/P1/P2/P3 in §1–4, next-phase sprint plan in §5. Update it as work lands.
- **Backlog** (07) and **Quiz/assignment plan** (08) are reference-only now — all active tasks live in 06.

## Reading paths

- **New contributor**: README → 01 → 05 → 04.
- **Backend work**: 02 → 03 → 04.
- **UI work**: 05 → 04.
- **Sprint planning**: 06 (everything — 07/08 are historical).
- **UAT / acceptance**: `requirement-utf8.txt` → 01 §TOR compliance → 04 acceptance criteria.
