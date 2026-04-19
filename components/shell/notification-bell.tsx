"use client";

import { useState, useCallback } from "react";
import { Bell, Inbox, CheckCircle2, AlertTriangle, Award, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

type NotificationType =
  | "SUBMISSION_RECEIVED"
  | "SUBMISSION_REVIEWED"
  | "REVISION_REQUESTED"
  | "CERTIFICATE_ISSUED"
  | "ENROLLMENT_APPROVED"
  | "ENROLLMENT_REJECTED"
  | "ENROLLMENT_REQUESTED";

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

function getNotificationIcon(type: string) {
  const map: Record<NotificationType, React.ReactNode> = {
    SUBMISSION_RECEIVED: <Inbox className="w-3.5 h-3.5 shrink-0" />,
    SUBMISSION_REVIEWED: <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-600" />,
    REVISION_REQUESTED: <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-orange-500" />,
    CERTIFICATE_ISSUED: <Award className="w-3.5 h-3.5 shrink-0 text-yellow-500" />,
    ENROLLMENT_APPROVED: <UserCheck className="w-3.5 h-3.5 shrink-0 text-green-600" />,
    ENROLLMENT_REJECTED: <UserX className="w-3.5 h-3.5 shrink-0 text-destructive" />,
    ENROLLMENT_REQUESTED: <Bell className="w-3.5 h-3.5 shrink-0" />,
  };
  return (map as Record<string, React.ReactNode>)[type] ?? <Bell className="w-3.5 h-3.5 shrink-0" />;
}

function formatRelativeTime(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return "เมื่อกี้";
  if (diffMin < 60) return `${diffMin}นาที`;
  if (diffHr < 24) return `${diffHr}ชั่วโมง`;
  return `${diffDay}วัน`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.slice(0, 10));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications?markAll=true", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) fetchNotifications();
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">การแจ้งเตือน</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              อ่านทั้งหมด
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <p className="text-center text-xs text-muted-foreground py-4">กำลังโหลด...</p>
          )}
          {!loading && notifications.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">ไม่มีการแจ้งเตือน</p>
          )}
          {!loading && notifications.map((n) => (
            <div
              key={n.id}
              className={`flex gap-2.5 px-3 py-2.5 border-b last:border-b-0 hover:bg-muted/40 transition-colors ${!n.isRead ? "bg-muted/20" : ""}`}
            >
              <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => setOpen(false)}
                    className="block"
                  >
                    <p className="text-xs font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  </Link>
                ) : (
                  <>
                    <p className="text-xs font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  </>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                {formatRelativeTime(n.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
