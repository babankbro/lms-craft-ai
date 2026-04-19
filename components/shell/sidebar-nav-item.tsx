"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

interface Props {
  item: NavItem;
  collapsed: boolean;
}

export function SidebarNavItem({ item, collapsed }: Props) {
  const pathname = usePathname();
  const isActive = item.matchPrefix
    ? pathname.startsWith(item.href)
    : pathname === item.href;

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 focus-ring",
        isActive
          ? "bg-[var(--brand-100)] text-[var(--brand-700)]"
          : "text-[var(--ink-2)] hover:bg-[var(--bg-muted)]"
      )}
    >
      {isActive && !collapsed && (
        <span
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full"
          style={{ background: "var(--brand-600)" }}
        />
      )}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span className="truncate">{item.label}</span>
      )}
    </Link>
  );
}
