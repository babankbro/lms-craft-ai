import { describe, it, expect } from "vitest";

type NotificationType =
  | "SUBMISSION_RECEIVED"
  | "SUBMISSION_REVIEWED"
  | "REVISION_REQUESTED"
  | "CERTIFICATE_ISSUED"
  | "ENROLLMENT_APPROVED"
  | "ENROLLMENT_REJECTED"
  | "ENROLLMENT_REQUESTED";

function getNotificationIcon(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    SUBMISSION_RECEIVED: "Inbox",
    SUBMISSION_REVIEWED: "CheckCircle2",
    REVISION_REQUESTED: "AlertTriangle",
    CERTIFICATE_ISSUED: "Award",
    ENROLLMENT_APPROVED: "UserCheck",
    ENROLLMENT_REJECTED: "UserX",
    ENROLLMENT_REQUESTED: "Bell",
  };
  return map[type] ?? "Bell";
}

function formatRelativeTime(createdAt: Date, now: Date): string {
  const diffMs = now.getTime() - createdAt.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "เมื่อกี้";
  if (diffMin < 60) return `${diffMin}นาที`;
  if (diffHr < 24) return `${diffHr}ชั่วโมง`;
  return `${diffDay}วัน`;
}

function filterUnread<T extends { isRead: boolean }>(notifications: T[]): T[] {
  return notifications.filter((n) => !n.isRead);
}

describe("getNotificationIcon", () => {
  it("returns Inbox for SUBMISSION_RECEIVED", () => {
    expect(getNotificationIcon("SUBMISSION_RECEIVED")).toBe("Inbox");
  });

  it("returns CheckCircle2 for SUBMISSION_REVIEWED", () => {
    expect(getNotificationIcon("SUBMISSION_REVIEWED")).toBe("CheckCircle2");
  });

  it("returns AlertTriangle for REVISION_REQUESTED", () => {
    expect(getNotificationIcon("REVISION_REQUESTED")).toBe("AlertTriangle");
  });

  it("returns Award for CERTIFICATE_ISSUED", () => {
    expect(getNotificationIcon("CERTIFICATE_ISSUED")).toBe("Award");
  });

  it("returns UserCheck for ENROLLMENT_APPROVED", () => {
    expect(getNotificationIcon("ENROLLMENT_APPROVED")).toBe("UserCheck");
  });

  it("returns UserX for ENROLLMENT_REJECTED", () => {
    expect(getNotificationIcon("ENROLLMENT_REJECTED")).toBe("UserX");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-04-19T12:00:00Z");

  it("returns เมื่อกี้ for < 1 minute", () => {
    const t = new Date("2026-04-19T11:59:45Z");
    expect(formatRelativeTime(t, now)).toBe("เมื่อกี้");
  });

  it("returns Xนาที for minutes ago", () => {
    const t = new Date("2026-04-19T11:55:00Z");
    expect(formatRelativeTime(t, now)).toBe("5นาที");
  });

  it("returns Xชั่วโมง for hours ago", () => {
    const t = new Date("2026-04-19T09:00:00Z");
    expect(formatRelativeTime(t, now)).toBe("3ชั่วโมง");
  });

  it("returns Xวัน for days ago", () => {
    const t = new Date("2026-04-17T12:00:00Z");
    expect(formatRelativeTime(t, now)).toBe("2วัน");
  });
});

describe("filterUnread", () => {
  it("returns only unread notifications", () => {
    const notifications = [
      { id: 1, isRead: false },
      { id: 2, isRead: true },
      { id: 3, isRead: false },
    ];
    expect(filterUnread(notifications)).toHaveLength(2);
    expect(filterUnread(notifications).map((n) => n.id)).toEqual([1, 3]);
  });

  it("returns empty array when all are read", () => {
    const notifications = [
      { id: 1, isRead: true },
      { id: 2, isRead: true },
    ];
    expect(filterUnread(notifications)).toHaveLength(0);
  });
});
