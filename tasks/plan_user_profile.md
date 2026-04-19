# Plan: User Profile Settings

## Status: PENDING

## Goal
Let users update their display name and change their password from within the app. Pairs with password reset (which handles unauthenticated recovery).

## Context

- No `/settings` route exists
- `User` has `fullName`, `passwordHash`, `groupName` — all editable
- Password change requires verifying the current password first
- No schema changes needed

## Dependency Graph

```
/settings page
  ├── T1 — profile form (fullName) + server action updateProfile
  └── T2 — change-password form + server action changePassword
             └── verify currentPassword before updating hash
```

## Vertical Slices

### T1 — Profile info form
- `app/settings/page.tsx` — requires auth; shows two cards side-by-side
- Card 1: fullName input; `updateProfile(formData)` server action
  - Updates `User.fullName`; revalidates session display name
  - **AC:** Name change persists and shows in sidebar
- Card 2: (placeholder for T2)
- **AC:** `/settings` accessible to all roles; page renders with current values

### T2 — Change password form
- Card 2: current password + new password + confirm inputs
- `changePassword(formData)` server action:
  - Loads `User.passwordHash`, verifies `currentPassword` with `bcryptjs.compare`
  - Rejects if current password wrong
  - Validates new password ≥ 8 chars, matches confirm
  - Updates `passwordHash`
- Unit tests in `tests/unit/change-password-logic.test.ts`: wrong current password rejected; too-short new password rejected; valid change accepted
- **AC:** Wrong current password shows Thai error; correct flow updates password + shows success

### T3 — Sidebar link
- Add "ตั้งค่าบัญชี" link to sidebar under the user section
- **AC:** Link visible in sidebar for all roles

## Checkpoints

| After | Gate |
|-------|------|
| T1 | Profile name update works end-to-end |
| T2 | Password change enforces current-password verification |
| T3 | Entry point in sidebar |
