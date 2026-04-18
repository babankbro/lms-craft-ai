import { prisma } from "@/lib/prisma";
import { requireAuth, canReview } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await requireAuth();
  if (!canReview(user.role)) redirect("/dashboard");

  const submissions = await prisma.submission.findMany({
    where: {
      status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
    },
    include: {
      student: { select: { fullName: true, email: true } },
      assignment: { select: { title: true } },
      files: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  // For MENTOR, only show submissions from their mentees
  const filteredSubmissions =
    user.role === "MENTOR"
      ? await prisma.submission.findMany({
          where: {
            status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
            student: { mentorId: user.id },
          },
          include: {
            student: { select: { fullName: true, email: true } },
            assignment: { select: { title: true } },
            files: true,
          },
          orderBy: { submittedAt: "desc" },
        })
      : submissions;

  const statusColor: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    SUBMITTED: "secondary",
    UNDER_REVIEW: "default",
    REVISION_REQUESTED: "destructive",
    APPROVED: "default",
    REJECTED: "destructive",
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ตรวจงาน</h1>
      <Card>
        <CardHeader>
          <CardTitle>งานที่รอตรวจ</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>นักเรียน</TableHead>
                <TableHead>งาน</TableHead>
                <TableHead>ไฟล์</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่ส่ง</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>{sub.student.fullName}</TableCell>
                  <TableCell>{sub.assignment.title}</TableCell>
                  <TableCell>{sub.files.length}</TableCell>
                  <TableCell>
                    <Badge variant={statusColor[sub.status] || "outline"}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString("th-TH") : "—"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/review/${sub.id}`}
                      className="text-primary hover:underline"
                    >
                      ตรวจ
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSubmissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    ไม่มีงานที่รอตรวจ
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
