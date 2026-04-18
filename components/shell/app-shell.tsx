import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "./sidebar";
import { SidebarMobile } from "./sidebar-mobile";
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
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar role={role} user={user} />

      {/* Mobile top bar + sheet */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center border-b px-4 md:hidden shrink-0">
          <SidebarMobile role={role} user={user} />
          <span className="ml-3 font-semibold text-sm">Mini LMS</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
