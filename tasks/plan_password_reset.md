# Plan: Password Reset (Forgot Password)

## Status: PENDING

## Goal
Allow users to recover access when they forget their password, and change their password from within the app. SMTP is already wired in `lib/mailer.ts`. No schema change exists yet.

## Context

- No `PasswordResetToken` table in schema
- `/login` exists; no "Forgot password?" link
- `lib/mailer.ts` handles `OutboundEmail` queue; new template needed: `PASSWORD_RESET`
- After reset, token should be single-use and expire in 1 hour

## Dependency Graph

```
PasswordResetToken schema
  └── T1 — schema + migration

sendPasswordResetEmail action (lib)
  └── T2 — lib/password-reset.ts: generateToken + sendResetEmail

Forgot-password page
  └── T3 — app/(auth)/forgot-password/page.tsx + actions.ts
        └── form: email input → creates token → queues email

Reset-password page
  └── T4 — app/(auth)/reset-password/[token]/page.tsx + actions.ts
        └── validates token (exists, not expired, not used)
        └── hashes new password + marks token used

Login page link
  └── T5 — add "ลืมรหัสผ่าน?" link to /login
```

## Vertical Slices

### T1 — Schema: PasswordResetToken
- Add model to `prisma/schema.prisma`:
  ```prisma
  model PasswordResetToken {
    id        Int      @id @default(autoincrement())
    userId    String   @map("user_id")
    token     String   @unique @default(cuid())
    expiresAt DateTime @map("expires_at")
    usedAt    DateTime? @map("used_at")
    createdAt DateTime @default(now()) @map("created_at")
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@map("password_reset_tokens")
  }
  ```
- Add `passwordResetTokens PasswordResetToken[]` to `User`
- Run `prisma migrate dev --name add_password_reset_token`
- **AC:** `prisma studio` shows new table; `User` relation resolves

### T2 — Email template + token logic
- Add `PASSWORD_RESET` case to `lib/mailer.ts` template switcher:
  ```
  subject: "รีเซ็ตรหัสผ่าน"
  html: link to /reset-password/[token]
  ```
- Create `lib/password-reset.ts`:
  - `createResetToken(email)` — finds user by email, creates token expiring in 1 h, queues `OutboundEmail`
  - `validateToken(token)` — returns `{ userId, valid: boolean, reason?: string }`
  - `consumeToken(token, newPassword)` — verifies token, hashes password, marks token used, updates User
- **AC:** Unit tests in `tests/unit/password-reset-logic.test.ts` cover: token expires correctly, consumed token rejected, wrong token rejected

### T3 — Forgot-password page
- `app/(auth)/forgot-password/page.tsx` — email input form (unauthenticated route)
- `app/(auth)/forgot-password/actions.ts` — server action calls `createResetToken`; always shows "ส่งอีเมลแล้ว" (no user enumeration)
- **AC:** Submitting with unknown email shows same success message; submitting with known email creates token in DB and queues email

### T4 — Reset-password page
- `app/(auth)/reset-password/[token]/page.tsx` — validates token on load; shows "expired/invalid" or password form
- New password + confirm password inputs; zod validation (min 8 chars, match)
- Server action calls `consumeToken`; on success redirects to `/login` with success toast
- **AC:** Using same token twice shows error; expired token (>1h) shows error; valid token → password updated → redirect

### T5 — Login page link
- Add "ลืมรหัสผ่าน?" link below login form pointing to `/forgot-password`
- **AC:** Link visible on `/login`

## Checkpoints

| After | Gate |
|-------|------|
| T1 | Migration applied; `PasswordResetToken` table in DB |
| T2 | Unit tests pass: token logic correct |
| T3 | Form sends without leaking user existence |
| T4 | Full flow works: request → email → click link → new password → login |
| T5 | Entry point visible on login page |
