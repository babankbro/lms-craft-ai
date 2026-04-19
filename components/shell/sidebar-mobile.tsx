"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarNavGroup } from "./sidebar-nav-group";
import { SidebarUserBlock } from "./sidebar-user-block";
import { getNavForRole, type Role } from "./nav-config";

interface Props {
  role: Role;
  user: { name: string; email: string; image?: string | null };
}

export function SidebarMobile({ role, user }: Props) {
  const [open, setOpen] = useState(false);
  const { primary, secondary } = getNavForRole(role);

  return (
    <div className="md:hidden">
      {/* Hamburger — shown in the top bar on mobile */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="เปิดเมนู"
        className="h-10 w-10 rounded-xl border border-border/70 bg-background/80"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 flex-col border-r border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(247,244,236,0.96))] p-0" aria-label="เมนูหลัก">
          <SheetTitle className="sr-only">เมนูหลัก</SheetTitle>
          {/* Header */}
          <div className="flex h-16 items-center border-b border-border/70 px-4 shrink-0">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                DigiNest
              </p>
              <p className="text-sm font-semibold">LMS Workspace</p>
            </div>
          </div>

          {/* Nav */}
          <ScrollArea className="flex-1 px-2 py-3">
            <SidebarNavGroup
              items={primary}
              collapsed={false}
              label="เมนูหลัก"
            />
            <SidebarNavGroup
              items={secondary}
              collapsed={false}
              showSeparatorAbove
            />
          </ScrollArea>

          {/* User block */}
          <div className="shrink-0 border-t border-border/70 px-2 py-3">
            <SidebarUserBlock
              name={user.name}
              email={user.email}
              image={user.image}
              role={role}
              collapsed={false}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
