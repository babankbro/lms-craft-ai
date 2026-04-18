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
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="เมนูผู้ใช้"
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={image ?? undefined} alt={name} />
            <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate font-medium leading-tight line-clamp-1">{name}</span>
              <Badge variant="secondary" className="mt-0.5 w-fit text-xs px-1.5 py-0">
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
