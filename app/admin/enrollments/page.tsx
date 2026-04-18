import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { approveEnrollment, rejectEnrollmentWithReason, revokeEnrollment } from "@/app/teach/[courseId]/enrollments/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "รอดำเนินการ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธแล้ว",
  CANCELLED: "ยกเลิก",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
};

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; courseId?: string }>;
}) {
  await requireRole("ADMIN");
  const { status, courseId } = await searchParams;
  const filterStatus = status ?? "PENDING";
  const filterCourseId = courseId ? parseInt(courseId) : undefined;

  // Tab counts — one query per status to avoid stale Prisma client type issues
  const [pendingCount, approvedCount, rejectedCount, cancelledCount] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM enrollments WHERE status = 'PENDING'`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM enrollments WHERE status = 'APPROVED'`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM enrollments WHERE status = 'REJECTED'`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM enrollments WHERE status = 'CANCELLED'`,
  ]);
  const countMap: Record<string, number> = {
    PENDING: Number(pendingCount[0]?.count ?? 0),
    APPROVED: Number(approvedCount[0]?.count ?? 0),
    REJECTED: Number(rejectedCount[0]?.count ?? 0),
    CANCELLED: Number(cancelledCount[0]?.count ?? 0),
  };

  // Course list for filter
  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: filterStatus as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED",
      ...(filterCourseId ? { courseId: filterCourseId } : {}),
    },
    include: {
      user: { select: { fullName: true, email: true, groupName: true } },
      course: { select: { title: true, id: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">จัดการคำขอลงทะเบียน</h1>
        <p className="text-muted-foreground text-sm mt-1">ทุกหลักสูตร</p>
      </div>

      {/* Status tabs with counts */}
      <div className="flex gap-2 flex-wrap items-center">
        {["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((s) => (
          <a key={s} href={`/admin/enrollments?status=${s}${filterCourseId ? `&courseId=${filterCourseId}` : ""}`}>
            <Badge variant={filterStatus === s ? "default" : "outline"} className="cursor-pointer gap-1">
              {STATUS_LABEL[s]}
              <span className="ml-1 rounded-full bg-white/20 px-1 text-xs">{countMap[s] ?? 0}</span>
            </Badge>
          </a>
        ))}
        {/* Course filter */}
        <form method="GET" className="ml-auto flex gap-2">
          <input type="hidden" name="status" value={filterStatus} />
          <select
            name="courseId"
            defaultValue={filterCourseId?.toString() ?? ""}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="">ทุกหลักสูตร</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="outline">กรอง</Button>
          {filterCourseId && (
            <a href={`/admin/enrollments?status=${filterStatus}`}>
              <Button type="button" size="sm" variant="ghost">ล้าง</Button>
            </a>
          )}
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STATUS_LABEL[filterStatus]} ({enrollments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>กลุ่ม</TableHead>
                <TableHead>หลักสูตร</TableHead>
                <TableHead>วันที่ขอ</TableHead>
                <TableHead>สถานะ / หมายเหตุ</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.user.fullName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.user.email}</TableCell>
                  <TableCell>{e.user.groupName ?? "—"}</TableCell>
                  <TableCell className="text-sm">{e.course.title}</TableCell>
                  <TableCell className="text-sm">{new Date(e.requestedAt).toLocaleDateString("th-TH")}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={STATUS_VARIANT[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                      {e.status === "REJECTED" && e.rejectReason && (
                        <p className="text-xs text-muted-foreground">{e.rejectReason}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 items-center">
                      {filterStatus === "PENDING" && (
                        <>
                          <form action={approveEnrollment.bind(null, e.id)}>
                            <Button type="submit" size="sm">อนุมัติ</Button>
                          </form>
                          <form
                            action={rejectEnrollmentWithReason.bind(null, e.id)}
                            className="flex gap-1"
                          >
                            <Input name="reason" placeholder="เหตุผล" className="h-8 w-28 text-xs" />
                            <Button type="submit" variant="destructive" size="sm">ปฏิเสธ</Button>
                          </form>
                        </>
                      )}
                      {filterStatus === "APPROVED" && (
                        <form action={revokeEnrollment.bind(null, e.id)}>
                          <Button type="submit" variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-white">
                            ถอนสิทธิ์
                          </Button>
                        </form>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {enrollments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    ไม่มีรายการ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
