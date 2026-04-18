import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Award,
  ClipboardCheck,
  Inbox,
  Users,
  Video,
  GraduationCap,
  Clapperboard,
  BarChart3,
  HelpCircle,
  UserCog,
  ClipboardList,
  Library,
  Handshake,
  PieChart,
  type LucideIcon,
} from "lucide-react";

export type Role = "STUDENT" | "MENTOR" | "INSTRUCTOR" | "ADMIN";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  matchPrefix?: boolean;
};

export const PRIMARY_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "แดชบอร์ด",
    icon: LayoutDashboard,
    roles: ["STUDENT", "MENTOR", "INSTRUCTOR", "ADMIN"],
    matchPrefix: false,
  },
  {
    href: "/courses",
    label: "คอร์สเรียน",
    icon: BookOpen,
    roles: ["STUDENT", "MENTOR", "INSTRUCTOR", "ADMIN"],
    matchPrefix: true,
  },
  {
    href: "/submissions",
    label: "งานที่ส่ง",
    icon: FileText,
    roles: ["STUDENT"],
    matchPrefix: true,
  },
  {
    href: "/certificates",
    label: "ใบประกาศ",
    icon: Award,
    roles: ["STUDENT"],
    matchPrefix: true,
  },
  {
    href: "/evaluations",
    label: "ประเมินตนเอง",
    icon: ClipboardCheck,
    roles: ["STUDENT", "MENTOR", "INSTRUCTOR", "ADMIN"],
    matchPrefix: true,
  },
  {
    href: "/review",
    label: "ตรวจงาน",
    icon: Inbox,
    roles: ["MENTOR", "INSTRUCTOR", "ADMIN"],
    matchPrefix: true,
  },
  {
    href: "/mentees",
    label: "ครูในสังกัด",
    icon: Users,
    roles: ["MENTOR", "ADMIN"],
    matchPrefix: true,
  },
  {
    href: "/observe",
    label: "วิดีโอการสอน",
    icon: Video,
    roles: ["MENTOR", "INSTRUCTOR", "ADMIN"],
    matchPrefix: true,
  },
  {
    href: "/teach",
    label: "ห้องสอน",
    icon: GraduationCap,
    roles: ["INSTRUCTOR", "ADMIN"],
    matchPrefix: true,
  },
  {
    href: "/videos",
    label: "วิดีโอชั้นเรียน",
    icon: Clapperboard,
    roles: ["MENTOR", "INSTRUCTOR", "ADMIN"],
    matchPrefix: true,
  },
  {
    href: "/reports",
    label: "รายงาน",
    icon: BarChart3,
    roles: ["INSTRUCTOR", "ADMIN"],
    matchPrefix: true,
  },
  {
    href: "/admin/users",
    label: "จัดการผู้ใช้",
    icon: UserCog,
    roles: ["ADMIN"],
    matchPrefix: true,
  },
  {
    href: "/admin/enrollments",
    label: "คำขอลงทะเบียน",
    icon: ClipboardList,
    roles: ["ADMIN"],
    matchPrefix: true,
  },
  {
    href: "/admin/courses",
    label: "หลักสูตร (Admin)",
    icon: Library,
    roles: ["ADMIN"],
    matchPrefix: true,
  },
  {
    href: "/admin/pairings",
    label: "จับคู่พี่เลี้ยง",
    icon: Handshake,
    roles: ["ADMIN"],
    matchPrefix: true,
  },
  {
    href: "/admin/evaluations",
    label: "ประเมินผล (Admin)",
    icon: PieChart,
    roles: ["ADMIN"],
    matchPrefix: true,
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    href: "/help",
    label: "ช่วยเหลือ",
    icon: HelpCircle,
    roles: ["STUDENT", "MENTOR", "INSTRUCTOR", "ADMIN"],
    matchPrefix: false,
  },
];

export function getNavForRole(role: Role): { primary: NavItem[]; secondary: NavItem[] } {
  return {
    primary: PRIMARY_NAV.filter((item) => item.roles.includes(role)),
    secondary: SECONDARY_NAV.filter((item) => item.roles.includes(role)),
  };
}

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "นักเรียน",
  MENTOR: "พี่เลี้ยง",
  INSTRUCTOR: "ผู้สอน",
  ADMIN: "ผู้ดูแล",
};
