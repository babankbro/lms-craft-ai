"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { SidebarNavGroup } from "./sidebar-nav-group";
import { SidebarUserBlock } from "./sidebar-user-block";
import { NotificationBell } from "./notification-bell";
import { getNavForRole, type Role } from "./nav-config";

const STORAGE_KEY = "lms.sidebar.collapsed";

interface Props {
  role: Role;
  user: { name: string; email: string; image?: string | null };
}

export function Sidebar({ role, user }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  const { primary, secondary } = getNavForRole(role);
  const adminItems = primary.filter((item) => item.href.startsWith("/admin"));
  const generalItems = primary.filter((item) => !item.href.startsWith("/admin"));

  return (
    <aside
      aria-label="เมนูหลัก"
      className={`hidden md:flex flex-col border-r bg-background transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-3 shrink-0">
        {!collapsed && (
          <span className="font-semibold text-sm truncate">Mini LMS</span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {!collapsed && <NotificationBell />}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="ย่อ/ขยายเมนู"
            aria-expanded={!collapsed}
            className="h-8 w-8 shrink-0"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-2 py-2">
        <SidebarNavGroup items={generalItems} collapsed={collapsed} />
        {adminItems.length > 0 && (
          <SidebarNavGroup
            items={adminItems}
            collapsed={collapsed}
            label="ผู้ดูแลระบบ"
            showSeparatorAbove
          />
        )}
        <SidebarNavGroup
          items={secondary}
          collapsed={collapsed}
          showSeparatorAbove
        />
      </ScrollArea>

      {/* User block */}
      <div className="shrink-0 border-t px-2 py-2">
        <SidebarUserBlock
          name={user.name}
          email={user.email}
          image={user.image}
          role={role}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
