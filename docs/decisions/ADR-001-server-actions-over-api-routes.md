# ADR-001: Server Actions for Mutations Instead of REST API Routes

## Status
Accepted

## Date
2026-04-19

## Context

Next.js 15 App Router provides two mechanisms for write operations:
1. **API routes** (`app/api/`) — traditional HTTP endpoints consumed by client-side fetch
2. **Server actions** — async functions that run on the server and can be called directly from server or client components

The project needed a consistent pattern for all form submissions and button-triggered mutations (enroll, submit assignment, grade, publish course, etc.).

## Decision

Use **server actions** for all write operations. API routes are reserved only for:
- File download responses (streaming, content-disposition headers)
- CSV exports
- Webhooks from external services

## Alternatives Considered

### REST API routes for everything
- Pros: Familiar REST pattern; easy to call from external clients
- Cons: Requires a separate fetch layer in every component; boilerplate for auth checks, CSRF, and JSON parsing; no automatic type safety between client and server
- Rejected: Server actions eliminate all this boilerplate and provide end-to-end type safety within the same codebase

### tRPC
- Pros: Type-safe RPC, good DX
- Cons: Additional dependency; conceptual mismatch with the App Router model; server actions achieve the same goal natively
- Rejected: Native Next.js server actions are sufficient; no need for an extra abstraction layer

### Mixed (actions for forms, API routes for fetch-based interactions)
- Rejected: Two patterns for the same concern creates confusion about which to reach for.

## Consequences

- All `actions.ts` files are co-located next to the page they serve
- Forms use `action={serverAction.bind(null, ...params)}` directly — no `onSubmit` handlers
- Optimistic UI and `useTransition` are used in the few client components that need loading state
- Mutations `revalidatePath` rather than managing client-side cache
- External integrations (if added later) would need an API route — the pattern makes this clear by exception
