# 10 · DigiNest Style Export for LMS

This document records the style direction applied to the LMS during the first DigiNest-style refresh pass.

## Source Status

The provided external design URL was:

`https://api.anthropic.com/v1/design/h/kMh79ta88BglHKsBaYAVHQ?open_file=DigiNest+LMS.html`

At implementation time on 2026-04-20, the URL returned **HTTP 404 Not Found**, so the exported HTML and any accompanying README could not be read. The notes below therefore describe the style language implemented in the LMS codebase itself, ready to be reconciled later against the real design export if a working link is provided.

## Applied Visual Direction

- **Tone**: calmer, more editorial, less default-shadcn.
- **Palette**: warm paper background, deep ink text, dark teal primary action, muted sage secondary surfaces.
- **Shape system**: slightly larger radii on containers, tighter radii on controls, reduced reliance on generic gray cards.
- **Depth**: soft layered shadows and subtle borders, not heavy glassmorphism.
- **Hierarchy**: more explicit page intros, section separation, and stat-card rhythm.
- **Navigation**: sidebar and mobile header now act as branded product chrome rather than neutral scaffolding.

## Token Intent

The refresh continues to use semantic design tokens from `app/globals.css`:

- `background` / `foreground` for page canvas and text
- `card` / `card-foreground` for primary content surfaces
- `primary` / `primary-foreground` for strong actions
- `secondary` / `secondary-foreground` for quiet surfaces and badges
- `accent` / `accent-foreground` for hover and active states
- `muted` / `muted-foreground` for supportive UI text
- `border` / `input` / `ring` for structure and focus

## First-Pass Application Areas

- `app/globals.css`: token refresh and canvas treatment
- `components/shell/*`: sidebar, mobile sheet, nav items, user block, notification bell
- `components/ui/button.tsx`: button shape and emphasis tuning
- `components/ui/card.tsx`: card structure and depth tuning
- `app/login/page.tsx`: branded sign-in experience
- `app/dashboard/_components/student-dashboard.tsx`: representative in-app dashboard surface

## Rollout Guidance

- Reuse tokens before adding new ad hoc colors.
- Prefer page sections with clear intros and compact stat summaries over repetitive neutral card grids.
- Keep all Thai copy concise and product-facing.
- Extend the style to other dashboards and high-traffic pages before touching edge-case admin surfaces.
- If the real DigiNest design export becomes available, compare:
  - color temperatures
  - spacing scale
  - sidebar density
  - card treatment
  - hero/overview patterns

## Non-Goals in This Pass

- No route restructuring
- No auth flow changes
- No dashboard data model changes
- No product rename in metadata without approval
