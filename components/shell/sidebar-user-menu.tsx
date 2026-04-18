"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function SidebarUserMenuContent() {
  return (
    <DropdownMenuContent side="top" align="start" className="w-52">
      <DropdownMenuItem asChild>
        <a href="/profile" className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          โปรไฟล์
        </a>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-destructive focus:text-destructive cursor-pointer"
        onSelect={(e) => {
          e.preventDefault();
          signOut({ callbackUrl: "/login" });
        }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        ออกจากระบบ
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
