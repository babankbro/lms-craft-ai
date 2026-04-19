# Plan: Apply DigiNest Design System

**Source**: `/tmp/lms/project/DigiNest LMS.html` + `src/primitives.jsx`  
**Goal**: Replace the current teal/hsl colour scheme with the DigiNest oklch-based sky-blue system while keeping all shadcn/ui components functional.

---

## Design system summary

| Token | Value |
|---|---|
| `--hue` | `225` (sky-blue anchor) |
| Font | IBM Plex Sans Thai (already loaded) |
| Border radii | 8 / 16 / 20 / 24 px (r-sm…r-xl) |
| Shadows | oklch-tinted xs / md / lg |
| Colour model | `oklch()` — perceptually uniform |
| Dark mode | `[data-theme="dark"]` attribute (+ keep `.dark` for shadcn) |
| Density | `[data-density="compact|comfortable"]` on `<html>` |

---

## Tasks

### T1 — globals.css: DigiNest CSS variables ✅
Add the full token set alongside shadcn HSL vars. Bridge shadcn vars to DigiNest colours so existing components keep working.

### T2 — globals.css: component utility classes ✅
Add `.surface`, `.surface-soft`, `.btn-primary`, `.btn-outline`, `.btn-ghost`, `.chip`, `.chip-brand/ghost/success/warn`, `.field`, `.focus-ring`, `.link`, `.kbd`, `.dn-p`, `.dn-pg`, animations.

### T3 — globals.css: dark mode + density ✅
Add `[data-theme="dark"]` overrides. Add `.dark` class mirror for shadcn. Add density padding classes.

### T4 — tailwind.config.ts: typography ✅
Unify heading + body font to IBM Plex Sans Thai (matching DigiNest single-font approach). Update radius tokens.

### T5 — app/layout.tsx: default density attribute ✅
Add `data-density="comfortable"` to `<html>` so dn-p classes work without JS.

### T6 — Sidebar + TopBar: adopt DigiNest tokens ✅
Update sidebar to use `--surface`, `--border`, `--brand-*` vars. Update active nav item style.

---

## Acceptance criteria

- [ ] `--hue: 225` drives entire brand palette
- [ ] Body background is `var(--bg)` (near-white oklch)
- [ ] Buttons use gradient brand fill on primary
- [ ] Sidebar uses `--surface` background with `--brand-100` active highlight
- [ ] Dark mode works via `[data-theme="dark"]` on `<html>`
- [ ] All existing shadcn UI components still render correctly
- [ ] IBM Plex Sans Thai used for all text
