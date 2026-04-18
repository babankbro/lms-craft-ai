# Mini LMS v3 — UI Design · Sidebar Navigation & Session Controls

> **Series:** Phase 6 of the Mini LMS v3 design set. Parents: [mini-lms-v3-01-overview-architecture.md](./mini-lms-v3-01-overview-architecture.md), [mini-lms-v3-02-foundation-auth-rbac.md](./mini-lms-v3-02-foundation-auth-rbac.md).
> **Scope:** Left-hand persistent sidebar covering role-aware navigation, active-route highlighting, user identity block, and **logout**. Visual model inspired by Claude Code's collapsible left nav (icon rail + expandable labels, user block pinned to bottom).
> **Non-scope:** Per-page content layouts, page-level tabs, mobile bottom-bar (covered separately in a future phase if needed — for v3, the sidebar collapses to a Sheet on `md:` and below).

---

## §0 Current State (as-built)

| # | Observation | Evidence |
|---|---|---|
| 1 | No sidebar exists. `app/layout.tsx` renders only `<Inter>` + `<Toaster/>`. | [mini-lms/app/layout.tsx](../mini-lms/app/layout.tsx) |
| 2 | No logout UI or action anywhere in source. `signOut` appears only in `.next/` build artifacts (NextAuth vendor code). Users currently cannot end their session from the app. | grep `signOut\|logout\|ออกจากระบบ` across `mini-lms/` — no hits in source |
| 3 | Dashboard routing is role-switched in `app/dashboard/page.tsx` (Student/Mentor/Instructor/Admin) but the user has no way to reach sibling sections unless they already know the URL. | [mini-lms/app/dashboard/page.tsx](../mini-lms/app/dashboard/page.tsx) |
| 4 | Required primitives already installed: `@radix-ui/react-avatar`, `@radix-ui/react-dropdown-menu`, `lucide-react`, shadcn `sheet`, `scroll-area`, `separator`, `button`. | [mini-lms/package.json](../mini-lms/package.json), [mini-lms/components/ui/](../mini-lms/components/ui/) |

> **Verdict:** Greenfield UI work — no migration concerns, no legacy components to retire.

---

## §1 Goals

1. Make every role-permitted section reachable in one click from any authenticated page.
2. Keep the current route visible at a glance (active highlight + breadcrumb-free).
3. Give the user a single, obvious place to **sign out** without hunting through menus.
4. Degrade gracefully on narrow viewports — never hide critical actions below a hamburger without also surfacing the user's identity.
5. Thai-first copy; all labels localisable from a single map.

---

## §2 Layout & Regions

```
┌────────────────────────────────────────────────────────────────┐
│ Sidebar (fixed, w-64 expanded / w-16 collapsed)  │   Main     │
│                                                    │            │
│  ┌──────────────────────────────┐                  │  <outlet>  │
│  │  [Logo]  Mini LMS           │  ← Header         │            │
│  ├──────────────────────────────┤                  │            │
│  │                              │                  │            │
│  │  Primary nav (role-filtered) │  ← Scroll area   │            │
│  │                              │                  │            │
│  │  — separator —               │                  │            │
│  │                              │                  │            │
│  │  Secondary nav (shared)      │                  │            │
│  │                              │                  │            │
│  ├──────────────────────────────┤                  │            │
│  │  [Avatar] Name         [▾]  │  ← User block    │            │
│  │          Role badge          │     (dropdown)   │            │
│  └──────────────────────────────┘                  │            │
└────────────────────────────────────────────────────────────────┘
```

- **Sidebar width:** `w-64` expanded, `w-16` icon-only when collapsed. Collapse state persists to `localStorage` key `lms.sidebar.collapsed`.
- **Breakpoint:** `< md` (768 px) — sidebar hides and is re-opened via a top-left `Menu` icon button that mounts `<Sheet side="left">`.
- **Main area:** fills remaining space (`flex-1`), owns its own scroll container, so the sidebar stays static during page scroll.

---

## §3 Component Tree

```
app/
  layout.tsx                        ← mounts <AppShell> around {children}
  (marketing)/
    login/page.tsx                  ← NO shell (pre-auth)
components/
  shell/
    app-shell.tsx                   ← decides shell vs bare based on session
    sidebar.tsx                     ← desktop sidebar
    sidebar-mobile.tsx              ← Sheet wrapper for < md
    sidebar-nav-group.tsx           ← <nav> section with heading + items
    sidebar-nav-item.tsx            ← single <Link> with icon + label + active ring
    sidebar-user-block.tsx          ← avatar + name + role + dropdown trigger
    sidebar-user-menu.tsx           ← DropdownMenu content (profile, theme, logout)
    nav-config.ts                   ← role → nav items map (single source of truth)
```

### 3.1 `<AppShell>`

Server component. Reads `getServerSession(authOptions)`.

- **No session** → renders `{children}` unwrapped (login page and any public route stay bare).
- **Session present** → wraps `{children}` in a flex row with `<Sidebar>` + `<SidebarMobile>` + `<main>`. Passes the resolved role down as a prop so child components stay pure.

### 3.2 `<Sidebar>`

Client component (needs collapse state and active-route awareness via `usePathname`).

Props: `{ role: Role; user: { name: string; email: string; image?: string } }`.

State: `collapsed: boolean` (hydrated from `localStorage` on mount; default `false`).

### 3.3 `<SidebarNavItem>`

```tsx
type SidebarNavItem = {
  href: string;
  label: string;         // Thai
  icon: LucideIcon;
  roles: Role[];         // which roles see it
  matchPrefix?: boolean; // true → active when pathname.startsWith(href)
};
```

- Renders a `<Link>` styled as a button.
- Active when `pathname === href` (or prefix match if `matchPrefix`). Active state = `bg-accent text-accent-foreground`, inactive = `hover:bg-accent/50`.
- When `collapsed`, label is hidden (`sr-only`) and icon is centered; tooltip on hover shows the label.

---

## §4 Navigation Map (role-filtered)

Single source of truth: `components/shell/nav-config.ts`. The table below is normative.

### 4.1 Primary — role-gated sections

| Item | Route | Icon (lucide) | STUDENT | MENTOR | INSTRUCTOR | ADMIN |
|---|---|---|:-:|:-:|:-:|:-:|
| แดชบอร์ด (Dashboard) | `/dashboard` | `LayoutDashboard` | ✅ | ✅ | ✅ | ✅ |
| คอร์สเรียน (Courses) | `/courses` | `BookOpen` | ✅ | ✅ | ✅ | ✅ |
| งานที่ส่ง (My submissions) | `/submissions` | `FileText` | ✅ | — | — | — |
| ใบประกาศ (Certificates) | `/certificates` | `Award` | ✅ | — | — | — |
| ประเมินตนเอง (Evaluations) | `/evaluations` | `ClipboardCheck` | ✅ | ✅ | ✅ | ✅ |
| ตรวจงาน (Review queue) | `/review` | `Inbox` | — | ✅ | ✅ | ✅ |
| ครูในสังกัด (Mentees) | `/mentees` | `Users` | — | ✅ | — | ✅ |
| วิดีโอการสอน (Observation videos) | `/observe` | `Video` | — | ✅ | ✅ | ✅ |
| ห้องสอน (Teach) | `/teach` | `GraduationCap` | — | — | ✅ | ✅ |
| วิดีโอชั้นเรียน (Videos) | `/videos` | `Clapperboard` | — | ✅ | ✅ | ✅ |
| รายงาน (Reports) | `/reports` | `BarChart3` | — | — | ✅ | ✅ |
| ผู้ดูแลระบบ (Admin) | `/admin` | `Shield` | — | — | — | ✅ |

### 4.2 Secondary — always-on

| Item | Route | Icon | All roles |
|---|---|---|:-:|
| ช่วยเหลือ (Help) | `/help` (future) | `HelpCircle` | ✅ |

> `matchPrefix: true` for every item above so sub-routes (e.g. `/courses/42/learn/7`) still highlight the parent.

---

## §5 User Block & Logout

### 5.1 Visual

Pinned to the bottom of the sidebar, above a `Separator`. Anatomy:

```
┌────────────────────────────────┐
│ [🟢 Avatar] ชื่อ นามสกุล    [▾] │
│             [STUDENT]          │
└────────────────────────────────┘
```

- **Avatar** — `<Avatar>` with `AvatarImage src={session.user.image}` and `<AvatarFallback>` = initials from `session.user.name`. A small presence dot is decorative only.
- **Name** — `session.user.name`, truncated with `line-clamp-1`.
- **Role badge** — `<Badge variant="secondary">` showing the localised role (`นักเรียน` / `พี่เลี้ยง` / `ผู้สอน` / `ผู้ดูแล`).
- **Caret** — opens a `DropdownMenu` anchored to the block.

### 5.2 Dropdown menu items

| Item | Icon | Action |
|---|---|---|
| โปรไฟล์ (Profile) | `User` | Links to `/profile` (placeholder — not a v3 blocker; hide if route doesn't exist yet) |
| สลับโหมด (Theme toggle) | `Sun/Moon` | Out of scope for v3 unless theming already exists; omit if not |
| **ออกจากระบบ (Sign out)** | `LogOut` | Calls `signOut({ callbackUrl: '/login' })` from `next-auth/react` |

Sign-out item styling: `text-destructive focus:text-destructive` to signal a destructive/session-ending action.

### 5.3 Logout contract

```tsx
// components/shell/sidebar-user-menu.tsx
"use client";
import { signOut } from "next-auth/react";

export function SignOutItem() {
  return (
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onSelect={(e) => {
        e.preventDefault();                     // prevent menu auto-close race
        signOut({ callbackUrl: "/login" });     // NextAuth clears JWT cookie, redirects
      }}
    >
      <LogOut className="mr-2 h-4 w-4" />
      ออกจากระบบ
    </DropdownMenuItem>
  );
}
```

- No custom API route needed — NextAuth's default `/api/auth/signout` handles cookie invalidation.
- Relies on the existing `authOptions` JWT strategy in [lib/auth.ts](../mini-lms/lib/auth.ts); `signOut` clears `next-auth.session-token`.
- `callbackUrl: "/login"` forces the post-logout landing so middleware does not bounce the user through `/dashboard` → `/login` on a stale render.

---

## §6 Accessibility

- Sidebar root is `<aside aria-label="เมนูหลัก">`; nav groups use `<nav aria-label="...">` with distinct labels.
- Active item carries `aria-current="page"`.
- Collapse toggle is `<button aria-label="ย่อ/ขยายเมนู" aria-expanded={!collapsed}>`.
- Mobile `Sheet` gets `aria-label="เมนูหลัก"` and traps focus while open (Radix default).
- Sign-out `DropdownMenuItem` announces as "ออกจากระบบ" — do not replace the label with just an icon.
- Keyboard: `Tab` reaches every item in visual order; `Enter`/`Space` activates; `Esc` closes the mobile sheet and any open dropdown.

---

## §7 Implementation Steps (bite-sized)

| # | Task | Files | Verification |
|---|---|---|---|
| 1 | Add `nav-config.ts` with the table in §4. | `components/shell/nav-config.ts` | Export a `getNavForRole(role)` function; unit-reviewable. |
| 2 | Build `<SidebarNavItem>` (active highlight via `usePathname`). | `components/shell/sidebar-nav-item.tsx` | Storybook-style manual check: navigate to `/courses/1` and confirm "คอร์สเรียน" is highlighted. |
| 3 | Build `<Sidebar>` with collapse state + `<SidebarUserBlock>`. | `components/shell/sidebar.tsx`, `sidebar-user-block.tsx` | Visual QA: collapse persists after reload. |
| 4 | Build `<SidebarMobile>` as a `Sheet` trigger at `md:hidden`. | `components/shell/sidebar-mobile.tsx` | Resize below 768 px → hamburger appears; sidebar disappears. |
| 5 | Wire `signOut` into `<SidebarUserMenu>` (dropdown + destructive item). | `components/shell/sidebar-user-menu.tsx` | Click Sign out → lands on `/login`; session cookie cleared (DevTools → Application). |
| 6 | Mount `<AppShell>` in `app/layout.tsx`; keep `/login` unwrapped. | `app/layout.tsx`, `components/shell/app-shell.tsx` | `/login` still renders bare; `/dashboard` shows the shell. |
| 7 | Add role → Thai label map for role badge. | `components/shell/nav-config.ts` (same file) | Log in as each seeded role, confirm badge text. |

> Each step should land as its own PR, reviewable in isolation. Step 5 is the one that closes the "no logout UI" gap.

---

## §8 Out of Scope (deferred)

- Persistent theme switcher (dark/light) — add only if product asks.
- Notifications bell + unread counter — tracked separately; `NotificationType` enum already exists in schema.
- Breadcrumbs — sidebar active-highlight is sufficient for v3.
- `/profile` page — link can point at a stub or be omitted from the dropdown until the route exists.

---

## §9 Open Questions

1. Should MENTOR see `/teach`? (Current mapping says no; product should confirm — some mentors may also author content in year 2.)
2. Should ADMIN see every section, or have a separate Admin-only shell with fewer distractions? Default: see everything, matches "god-mode" expectation.
3. Confirm role-to-Thai labels (`นักเรียน / พี่เลี้ยง / ผู้สอน / ผู้ดูแล`) match the product glossary.
