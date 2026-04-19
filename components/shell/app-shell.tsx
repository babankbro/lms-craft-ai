import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "./sidebar";
import { SidebarMobile } from "./sidebar-mobile";
import { NotificationBell } from "./notification-bell";
import type { Role } from "./nav-config";

interface Props {
  children: React.ReactNode;
}

export async function AppShell({ children }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return <>{children}</>;
  }

  const role = session.user.role as Role;
  const user = {
    name: session.user.fullName ?? session.user.name ?? session.user.email ?? "User",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
  };

  return (
    <div className="flex min-h-screen bg-transparent">
      {/* Desktop sidebar */}
      <Sidebar role={role} user={user} />

      {/* Mobile top bar + sheet */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile top bar */}
        <header
          className="sticky top-0 z-30 flex h-16 items-center px-4 backdrop-blur md:hidden shrink-0"
          style={{ background: "color-mix(in oklch, var(--bg) 85%, transparent)", borderBottom: "1px solid var(--border-soft)", backdropFilter: "blur(12px)" }}
        >
          <SidebarMobile role={role} user={user} />
          <div className="ml-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              DigiNest
            </p>
            <p className="text-sm font-semibold">ระบบนิเทศและหนุนเสริม</p>
          </div>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
