# Plan: Bulk Enrollment Import

## Status: PENDING

## Goal
Admins and instructors can upload a CSV of student emails to enroll them in a course. New users are created if they don't exist. All imported enrollments are set to APPROVED. A summary report shows success / skipped / errors.

## Context

- Enrollment is currently one-by-one via the student request flow
- `User` model: email (unique), fullName, passwordHash (required) — new users need a temporary password
- Import should be idempotent: re-importing the same email for the same course is a no-op (skip, not error)
- Admin can import into any course; Instructor only into their own courses
- CSV format: `email,full_name,group_name` (group_name optional)

## Dependency Graph

```
CSV parse + validation lib
  └── T1 — lib/enrollment-import.ts: parseImportCsv + validateRow + generateTempPassword

Import server action
  └── T2 — app/teach/[courseId]/enrollments/actions.ts: importEnrollmentsCsv
              └── upsert users (by email)
              └── upsert enrollments (skip existing APPROVED)
              └── return ImportResult[]

Import UI
  └── T3 — ImportEnrollmentForm client component
              └── file input (CSV only)
              └── submit → calls action → shows result table

Wire into enrollments page
  └── T4 — add import section to teach/[courseId]/enrollments/page.tsx
              └── link from workbench
```

## Vertical Slices

### T1 — CSV parse + validation (pure library)
- `lib/enrollment-import.ts`:
  ```ts
  type ImportRow = { email: string; fullName: string; groupName?: string };
  type ParseResult = { rows: ImportRow[]; errors: string[] };
  function parseImportCsv(csvText: string): ParseResult
  function generateTempPassword(): string  // 10-char random alphanumeric
  ```
- Validates: email format, fullName not empty, max 500 rows
- Trims whitespace; skips blank lines; skips header row
- Unit tests in `tests/unit/enrollment-import-parse.test.ts`:
  - valid CSV parsed correctly
  - invalid email caught in errors
  - blank lines skipped
  - too many rows returns error
- **AC:** All unit tests pass; no Prisma dependency in this file

### T2 — Import server action
- `importEnrollmentsCsv(courseId: number, csvText: string)` in `app/teach/[courseId]/enrollments/actions.ts`
- Auth: requireRole INSTRUCTOR/ADMIN; instructor must own course
- Calls `parseImportCsv`; returns early if parse errors
- For each valid row:
  1. `upsert` User by email (create with temp password if new)
  2. `upsert` Enrollment (create APPROVED; if exists and APPROVED → skip; if PENDING/REJECTED → update to APPROVED)
- Returns `ImportSummary`: `{ created: number; existing: number; errors: string[] }`
- Revalidates enrollment page
- **AC:** Importing same email twice → second is skipped; new user created with random password

### T3 — Import form component
- `app/teach/[courseId]/enrollments/_components/import-enrollment-form.tsx` (client)
- File input: `.csv` only, max 2 MB
- On select: reads file as text; on submit: calls action
- Shows loading state; on result: renders summary table:
  ```
  ✓ สร้างใหม่ N คน  |  ⊘ มีอยู่แล้ว N คน  |  ✕ ข้อผิดพลาด N รายการ
  [Error list if any]
  ```
- Includes download link for a CSV template
- **AC:** User sees clear success/error summary; errors list specific rows (email + reason)

### T4 — Wire into enrollments page
- Add "นำเข้านักเรียน (CSV)" section to `app/teach/[courseId]/enrollments/page.tsx`
- Renders `<ImportEnrollmentForm courseId={courseId} />`
- Also add to admin enrollments area
- **AC:** Import section visible in instructor + admin enrollment management pages

## CSV Template

```csv
email,full_name,group_name
student1@example.com,สมชาย ใจดี,กลุ่ม 1
student2@example.com,มาลี สุขใจ,กลุ่ม 1
student3@example.com,ประชา ดีงาม,
```

## Checkpoints

| After | Gate |
|-------|------|
| T1 | Unit tests pass; parse handles malformed input gracefully |
| T2 | Idempotent import; new users get temp password; existing enrollments not duplicated |
| T3 | UI shows meaningful summary; errors list specific row |
| T4 | Feature accessible from instructor + admin enrollment pages |
