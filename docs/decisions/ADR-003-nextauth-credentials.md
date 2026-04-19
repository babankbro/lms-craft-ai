# ADR-003: NextAuth.js with Credentials Provider

## Status
Accepted

## Date
2026-04-19

## Context

The LMS is a closed platform — students are enrolled by instructors and do not self-register via social login. Authentication needs to be email + password, with role information (STUDENT / INSTRUCTOR / MENTOR / ADMIN) available in every session.

## Decision

Use **NextAuth.js v4** with a **credentials provider**. Passwords are hashed with `bcryptjs`. The `role` field is embedded in the JWT and extended onto the `Session` type.

## Alternatives Considered

### Clerk / Auth0 / Supabase Auth
- Pros: Managed service, social login, MFA, user management UI
- Cons: External dependency; role management requires custom claims; cost at scale; all users are already managed inside this application's own DB
- Rejected: The app manages its own `User` table; an external auth provider would duplicate user state

### lucia-auth
- Pros: Lightweight, TypeScript-first, no magic
- Cons: More setup; session management would be custom
- Rejected: NextAuth provides sufficient abstraction with less boilerplate for a credentials flow

### Plain JWT / custom sessions
- Rejected: No need to reinvent session management when NextAuth handles it correctly

## Consequences

- `lib/auth.ts` contains `authOptions` — the single configuration point
- `requireAuth()` and `requireRole()` helpers in `lib/permissions.ts` are the only way pages and actions access the current user — never call `getServerSession` in application code directly
- The `role` field on `Session.user` is a custom extension; TypeScript types for this live in `types/next-auth.d.ts`
- NextAuth v4 is used (not v5 / Auth.js) — API is `getServerSession(authOptions)`, not the v5 `auth()` function. Do not migrate without a full review.
- Password reset is not yet implemented; `SMTP_*` env vars are available for future use via `lib/mailer.ts`
