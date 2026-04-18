import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import { approveEnrollment, rejectEnrollment } from "./actions";
import { BulkEnrollmentTable } from "./_components/bulk-actions";
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

export default async function CourseEnrollmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const { courseId } = await params;
  const { status } = await searchParams;
  const id = parseInt(courseId);

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, title: true, authorId: true },
  });
  if (!course) notFound();
  if (user.role === "INSTRUCTOR" && course.authorId !== user.id) redirect("/teach");

  const filterStatus = status ?? "PENDING";

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: id, status: filterStatus as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" },
    include: { user: { select: { fullName: true, email: true, groupName: true } } },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">คำขอลงทะเบียน</h1>
        <p className="text-muted-foreground text-sm mt-1">{course.title}</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2">
        {["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((s) => (
          <a key={s} href={`/teach/${id}/enrollments?status=${s}`}>
            <Badge variant={filterStatus === s ? "default" : "outline"} className="cursor-pointer">
              {STATUS_LABEL[s]}
            </Badge>
          </a>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {STATUS_LABEL[filterStatus]} ({enrollments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filterStatus === "PENDING" ? (
            <BulkEnrollmentTable
              courseId={id}
              enrollments={enrollments.map((e) => ({
                id: e.id,
                userId: e.userId,
                userName: e.user.fullName,
                userEmail: e.user.email,
                groupName: e.user.groupName,
                requestedAt: e.requestedAt,
                status: e.status,
              }))}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>กลุ่ม</TableHead>
                  <TableHead>วันที่ขอ</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.user.fullName}</TableCell>
                    <TableCell>{e.user.email}</TableCell>
                    <TableCell>{e.user.groupName ?? "—"}</TableCell>
                    <TableCell>{new Date(e.requestedAt).toLocaleDateString("th-TH")}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {enrollments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      ไม่มีรายการ
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
