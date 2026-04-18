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
        className="h-9 w-9"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col" aria-label="เมนูหลัก">
          <SheetTitle className="sr-only">เมนูหลัก</SheetTitle>
          {/* Header */}
          <div className="flex h-14 items-center border-b px-4 shrink-0">
            <span className="font-semibold text-sm">Mini LMS</span>
          </div>

          {/* Nav */}
          <ScrollArea className="flex-1 px-2 py-2">
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
          <div className="shrink-0 border-t px-2 py-2">
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
