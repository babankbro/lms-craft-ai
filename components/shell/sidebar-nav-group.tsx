import { Separator } from "@/components/ui/separator";
import { SidebarNavItem } from "./sidebar-nav-item";
import type { NavItem } from "./nav-config";

interface Props {
  items: NavItem[];
  collapsed: boolean;
  label?: string;
  showSeparatorAbove?: boolean;
}

export function SidebarNavGroup({ items, collapsed, label, showSeparatorAbove }: Props) {
  if (items.length === 0) return null;

  return (
    <div>
      {showSeparatorAbove && <Separator className="my-2" />}
      {label && !collapsed && (
        <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {label}
        </p>
      )}
      <nav aria-label={label ?? "เมนู"} className="space-y-0.5">
        {items.map((item) => (
          <SidebarNavItem key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>
    </div>
  );
}
