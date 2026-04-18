# 05 · UI Design System

Reflects the current codebase after the 2026-04-18 Prompt-font + layout consolidation.

## 1. Typography — **Prompt**

Mini LMS uses the [Google Fonts "Prompt"](https://fonts.google.com/specimen/Prompt) typeface for both Thai and Latin glyphs, loaded via `next/font/google` in [`app/layout.tsx`](../mini-lms/app/layout.tsx):

```ts
const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});
```

The CSS variable `--font-prompt` is exposed on `<html>` and mapped into Tailwind's `font-sans` in `tailwind.config.ts`:

```ts
fontFamily: {
  sans: ["var(--font-prompt)", ...defaultTheme.fontFamily.sans],
},
```

**Consequences**:
- Every `font-sans` class (the Tailwind default on text) renders Prompt.
- No `font-prompt` class is needed — `font-sans` is Prompt.
- Fallback chain preserves system sans if the font fails to load.
- `html` sets `text-rendering: optimizeLegibility` and macOS-style antialiasing (see `globals.css`).
- Headings get `tracking-tight` globally via the `@layer base` block.

## 2. Colour tokens

All colours live as HSL channels on CSS custom properties in [`globals.css`](../mini-lms/app/globals.css), with a matching dark-mode override under `.dark`. Tailwind references them through semantic classes: `bg-background`, `text-foreground`, `border-border`, `bg-primary`, etc. — defined in `tailwind.config.ts`.

| Token | Light | Dark | Used for |
|-------|-------|------|----------|
| `--background` | `0 0% 100%` | `222.2 84% 4.9%` | Page canvas |
| `--foreground` | `222.2 84% 4.9%` | `210 40% 98%` | Body text |
| `--card` / `--popover` | `0 0% 100%` | `222.2 84% 4.9%` | Surface panels |
| `--primary` | `222.2 47.4% 11.2%` | `210 40% 98%` | Primary buttons / accents |
| `--secondary` | `210 40% 96.1%` | `217.2 32.6% 17.5%` | Quiet buttons, chips |
| `--muted` | `210 40% 96.1%` | `217.2 32.6% 17.5%` | Deprioritised surfaces |
| `--accent` | `210 40% 96.1%` | `217.2 32.6% 17.5%` | Hover states |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` | Errors, destructive actions |
| `--border` / `--input` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | Dividers, input borders |
| `--ring` | `222.2 84% 4.9%` | `212.7 26.8% 83.9%` | Focus outlines |
| `--radius` | `0.5rem` | (same) | Border radius base |

**Rule**: never hard-code hex or rgb in component styles. Always use token classes (`bg-primary`, `text-muted-foreground`, etc.). That keeps dark-mode free.

## 3. Page layout

The root shell is defined in [`components/shell/app-shell.tsx`](../mini-lms/components/shell/app-shell.tsx):

- **Unauthenticated**: `{children}` unwrapped — lets `/login` and `/` render full-bleed.
- **Authenticated**: fixed-height flex split — `Sidebar` (≥ md) or a top-bar with `Sheet` (< md) on the left, scrollable `<main>` on the right.

### Page content conventions

| Area | Wrapper | Notes |
|------|---------|-------|
| `/admin/*` | Provided by `app/admin/layout.tsx`: `<div className="mx-auto max-w-6xl px-6 py-8">` | Added 2026-04-18 to stop flush-left drift |
| `/teach/*` | Provided by `app/teach/layout.tsx` with top-bar + `<div className="max-w-6xl mx-auto px-6 py-8">` | Includes per-page top-bar with breadcrumb + "New" action |
| Student / mentor pages | Per-page wrapper `<div className="p-8 max-w-4xl mx-auto">` (or `max-w-5xl` for reports) | Convention. `/dashboard` intentionally spans full width. |

**Do** follow the existing wrapper when adding a new page under one of the domains. **Don't** introduce a third `max-w-*` variant without updating this doc.

## 4. Sidebar

Defined in [`components/shell/`](../mini-lms/components/shell/) — split across `sidebar.tsx`, `sidebar-mobile.tsx`, `sidebar-nav-group.tsx`, `sidebar-nav-item.tsx`, `sidebar-user-block.tsx`, `sidebar-user-menu.tsx`, and `nav-config.ts`.

- **Collapse state** persists in `localStorage` under `lms.sidebar.collapsed`.
- **Role-aware nav**: `getNavForRole(role)` in `nav-config.ts` returns `{ primary, secondary }` arrays. The sidebar renders admin items in a labelled group `"ผู้ดูแลระบบ"`, non-admin items in the main group, and secondary items (help / logout-style) in a footer group.
- **Mobile**: `<SidebarMobile>` uses a `Sheet` triggered from a 14-tall top bar. Visible only below `md`.
- **Accessibility**: `aside` has `aria-label="เมนูหลัก"`; the collapse toggle has `aria-expanded`. Nav items are keyboard-focusable via `Link`.

### Adding a nav item

1. Open `components/shell/nav-config.ts`.
2. Add an entry to the appropriate role's `primary` or `secondary` array. Required fields: `{ href, label, icon, roles?: Role[] }`.
3. Icons come from `lucide-react`.
4. Test in each role via the seed users.

## 5. Components

- **UI primitives** in [`components/ui/`](../mini-lms/components/ui/) are shadcn/ui (default style, not new-york). Installed: `avatar`, `badge`, `button`, `card`, `dropdown-menu`, `input`, `label`, `progress`, `radio-group`, `scroll-area`, `select`, `separator`, `sheet`, `table`, `tabs`, `textarea`, `toast`, `toaster`.
- **Shared**: [`components/shared/file-upload-dropzone.tsx`](../mini-lms/components/shared/file-upload-dropzone.tsx) — drag-drop upload with mime / size validation.
- **Feature components** live colocated with the page under a `_components/` folder, e.g. `app/admin/users/_components/role-select.tsx`. This keeps server/client boundaries narrow and easy to reason about.

## 6. Icons

`lucide-react` is the only icon library. Use semantic icons (e.g. `Users`, `GraduationCap`, `BookOpen`) and size them to `h-4 w-4` next to `text-sm`, or `h-5 w-5` for solo headers.

## 7. Forms & feedback

- **Validation** on the client via `react-hook-form` (where present) + Zod schemas from `lib/validators/*`, mirrored on the server.
- **Toasts** via `@/components/ui/toaster` mounted once in the root layout; imperative via `useToast()`.
- **Dialogs / sheets** via Radix `@radix-ui/react-dialog` primitives exposed through shadcn wrappers.

## 8. Dark mode

Class-based (`darkMode: ["class"]`). No toggle is wired yet — users will get system dark via the `.dark` class once a theme switcher is added (tracked in [06-implementation-plan.md](./06-implementation-plan.md) as P3 polish).

## 9. Content density

Admin tables default to shadcn `<Table>` with `text-sm` rows. Cards use `<Card><CardHeader><CardTitle>…</CardTitle></CardHeader><CardContent>…</CardContent></Card>`. Horizontal rules via `<Separator />`. Avoid custom dividers.

## 10. i18n

- `html lang="th"` at the root.
- All UI strings are Thai. English is limited to technical identifiers (role names in code, table columns, DB fields).
- New copy should be written in Thai. If you don't have a translation, leave a `// TODO: th copy` and flag it in the PR.

## 11. Accessibility checklist

- Focus ring (`--ring` token) is visible on all interactive primitives — do not override with `outline-none` without a replacement.
- Labels on every input (`<Label htmlFor>` + `<Input id>`).
- `aria-label` on icon-only buttons.
- Thai characters get proper line-height via the Prompt font — don't override line-height below `1.5` on body text.
