import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { SubmissionStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  SUBMITTED: "ส่งแล้ว",
  UNDER_REVIEW: "กำลังตรวจ",
  REVISION_REQUESTED: "แก้ไข",
  APPROVED: "ผ่าน",
  REJECTED: "ไม่ผ่าน",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  UNDER_REVIEW: "default",
  REVISION_REQUESTED: "destructive",
  APPROVED: "default",
  REJECTED: "destructive",
};

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireAuth();
  const { status } = await searchParams;

  const where = {
    studentId: user.id,
    ...(status ? { status: status as SubmissionStatus } : {}),
  };

  const submissions = await prisma.submission.findMany({
    where,
    include: {
      assignment: {
        include: {
          lesson: {
            include: { course: { select: { title: true, slug: true } } },
          },
        },
      },
      files: { select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const statuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "REVISION_REQUESTED", "APPROVED"];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">งานของฉัน</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Link href="/submissions">
          <Badge variant={!status ? "default" : "outline"}>ทั้งหมด</Badge>
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/submissions?status=${s}`}>
            <Badge variant={status === s ? "default" : "outline"}>{STATUS_LABEL[s]}</Badge>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการงาน ({submissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วิชา</TableHead>
                <TableHead>งาน</TableHead>
                <TableHead>ไฟล์</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead>ดู</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>{sub.assignment.lesson.course.title}</TableCell>
                  <TableCell>{sub.assignment.title}</TableCell>
                  <TableCell>{sub.files.length}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[sub.status] ?? "outline"}>
                      {STATUS_LABEL[sub.status] ?? sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sub.submittedAt
                      ? new Date(sub.submittedAt).toLocaleDateString("th-TH")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/submissions/${sub.id}`} className="text-primary hover:underline text-sm">
                      ดูรายละเอียด
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {submissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    ยังไม่มีงานที่ส่ง
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
