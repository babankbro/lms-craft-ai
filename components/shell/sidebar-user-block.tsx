"use client";

import { ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarUserMenuContent } from "./sidebar-user-menu";
import { ROLE_LABEL, type Role } from "./nav-config";

interface Props {
  name: string;
  email: string;
  image?: string | null;
  role: Role;
  collapsed: boolean;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function SidebarUserBlock({ name, image, role, collapsed }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left text-sm transition-colors hover:border-border/60 hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="เมนูผู้ใช้"
        >
          <Avatar className="h-9 w-9 shrink-0 border border-border/60">
            <AvatarImage src={image ?? undefined} alt={name} />
            <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate font-medium leading-tight line-clamp-1">{name}</span>
              <Badge variant="secondary" className="mt-1 w-fit border border-border/70 px-2 py-0.5 text-[11px] font-medium">
                {ROLE_LABEL[role]}
              </Badge>
            </div>
          )}
          {!collapsed && <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </button>
      </DropdownMenuTrigger>
      <SidebarUserMenuContent />
    </DropdownMenu>
  );
}
