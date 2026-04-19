# Implementation Plan: DigiNest Style Rollout for LMS

## Overview
Apply a production-quality visual refresh to the LMS using the existing Next.js + Tailwind + shadcn structure. The supplied Anthropic design export URL currently returns HTTP 404, so this plan documents a safe rollout that aligns the current product shell with a more intentional, modern LMS presentation while preserving the existing information architecture and Thai-language UX.

## Architecture Decisions
- Keep the current semantic token model in `app/globals.css` and refresh the values rather than scattering one-off classes across pages.
- Apply the first style slice to shared surfaces first: authenticated shell, navigation, notification popover, login, and one representative dashboard.
- Preserve existing route structure, role-aware navigation, and shadcn primitives so styling changes remain low-risk and reversible.
- Add a written plan artifact before implementation so later style work can extend from the same source of truth.
- Treat the inaccessible external design file as a blocker for exact parity, not as permission to guess undocumented layout details.

## Task List

### Phase 1: Foundation
- [x] Task 1: Audit the current shell, login page, dashboards, and UI token setup.
- [x] Task 2: Capture the rollout plan and scope in a dedicated task document.

### Checkpoint: Foundation
- [x] Shared implementation surface is identified.
- [x] Style work is constrained to reusable tokens and high-visibility pages.

### Phase 2: Core Style Slice
- [ ] Task 3: Refresh global color tokens, background treatment, radii, and base typography contrast in `app/globals.css`.
- [ ] Task 4: Restyle shared authenticated chrome in `components/shell/*` so sidebar, top bar, nav items, and notification UI feel coherent.
- [ ] Task 5: Redesign `app/login/page.tsx` around the new visual language while keeping the existing auth flow unchanged.
- [ ] Task 6: Update `app/dashboard/_components/student-dashboard.tsx` as the first representative content surface.

### Checkpoint: Core Slice
- [ ] The shell reads as one visual system on desktop and mobile.
- [ ] The login experience matches the new tone and still supports current auth behavior.
- [ ] The student dashboard uses the new hierarchy, spacing, and card styling without breaking data rendering.

### Phase 3: Follow-up Rollout
- [ ] Task 7: Apply the same style language to the remaining role dashboards.
- [ ] Task 8: Extend the visual treatment to high-traffic student learning pages and instructor workbench pages.
- [ ] Task 9: If the Anthropic design export becomes accessible, reconcile tokens, spacing, and layout details against the actual design README and file structure.

### Checkpoint: Complete
- [ ] Visual system is consistent across all primary LMS surfaces.
- [ ] No page relies on ad hoc colors that bypass semantic tokens.
- [ ] Design decisions are documented and reviewable.

## Acceptance Criteria
- [ ] Shared surfaces use semantic tokens rather than page-specific hard-coded palette drift.
- [ ] Desktop sidebar and mobile top bar share the same brand language.
- [ ] Login remains fully functional and accessible with keyboard and screen-reader semantics intact.
- [ ] Representative dashboard surface shows clearer hierarchy, spacing, and status presentation.
- [ ] The implementation explicitly notes that the supplied external design export was unavailable at implementation time.

## Verification
- [ ] Run `npm test` or targeted UI/unit checks if available for touched surfaces.
- [ ] Run `npm run build` when environment dependencies are available.
- [ ] Manual check on `/login`, authenticated shell, and `/dashboard`.

## Files Likely Touched
- `app/globals.css`
- `app/login/page.tsx`
- `components/shell/app-shell.tsx`
- `components/shell/sidebar.tsx`
- `components/shell/sidebar-mobile.tsx`
- `components/shell/sidebar-nav-item.tsx`
- `components/shell/sidebar-user-block.tsx`
- `components/shell/notification-bell.tsx`
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `app/dashboard/_components/student-dashboard.tsx`

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| External design export remains inaccessible | High | Document the blocker explicitly and keep the implementation token-driven so exact parity can be applied later |
| Shared shell changes create regressions across roles | Medium | Limit the first slice to styling only; do not alter nav logic or auth/session behavior |
| New styling clashes with existing page-specific classes | Medium | Push changes through shared primitives and high-level wrappers first |
| Visual refresh looks inconsistent across mobile and desktop | Medium | Update desktop sidebar and mobile header/sheet in the same pass |

## Open Questions
- Is there an alternate public link or exported bundle for the Anthropic design so the README and source HTML can be read directly?
- Should the refreshed visual direction also rename product chrome to `DigiNest LMS`, or should that remain only in design references until approved?
